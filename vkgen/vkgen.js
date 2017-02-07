/****************************************************************************
**
** Copyright (C) 2017 The Qt Company Ltd.
** Contact: https://www.qt.io/licensing/
**
** This file is part of the utils of the Qt Toolkit.
**
** $QT_BEGIN_LICENSE:GPL-EXCEPT$
** Commercial License Usage
** Licensees holding valid commercial Qt licenses may use this file in
** accordance with the commercial license agreement provided with the
** Software or, alternatively, in accordance with the terms contained in
** a written agreement between you and The Qt Company. For licensing terms
** and conditions see https://www.qt.io/terms-conditions. For further
** information use the contact form at https://www.qt.io/contact-us.
**
** GNU General Public License Usage
** Alternatively, this file may be used under the terms of the GNU
** General Public License version 3 as published by the Free Software
** Foundation with exceptions as appearing in the file LICENSE.GPL3-EXCEPT
** included in the packaging of this file. Please review the following
** information to ensure the GNU General Public License requirements will
** be met: https://www.gnu.org/licenses/gpl-3.0.html.
**
** $QT_END_LICENSE$
**
****************************************************************************/

var vkp = require("./vkxmlparser.js");
var getopt = require("node-getopt");
var fs = require("fs");

function main() {
    var opt = getopt.create([
        ["", "help", "Display this help." ],
        ["", "version", "Show version." ],
        ["f", "file=FILENAME", "Input XML file (default: vk.xml)"],
        ["c", "impl", "Output qvulkanfunctions.cpp snippet" ],
        ["h", "header", "Output qvulkanfunctions.h snippet" ],
        ["d", "pimpl", "Output qvulkanfunctions.cpp private snippet" ],
        ["p", "pheader", "Output qvulkanfunctions_p.h snippet" ]
    ]);
    opt.setHelp(
        "Usage: node vkgen.js [OPTIONS]\n" +
        "QVulkanFunctions generator.\n\n" +
        "[[OPTIONS]]\n"
    );
    var opts = opt.bindHelp().parseSystem();
    if (opts.options.version) {
        console.log("vkgen.js v1.0");
        return;
    }

    var ignoredFuncs = [ "vkCreateInstance", "vkDestroyInstance", "vkGetInstanceProcAddr" ];
    var wantedExtensions = []; // only instance-level extensions supported here

    var xmlfile = opts.options.file || "vk.xml";

    vkp.parse(xmlfile, wantedExtensions, function (commands) {
        console.log("// ----- This section is autogenerated by vkgen.js. Do not edit.\n");
        commands.forEach(function (command) {
            if (ignoredFuncs.indexOf(command.name) >= 0)
                return;
            var typedParamList = "";
            command.params.forEach(function (param) {
                if (typedParamList.length)
                    typedParamList += ", ";
                typedParamList += param.type + " " + param.name + param.typeSuffix;
            });
            if (opts.options.impl) {
                console.log(command.type + " QVulkanFunctions::" + command.name + "(" + typedParamList + ")");
                console.log("{\n    Q_ASSERT(d_ptr->" + command.name + ");");
                var call = command.type !== "void" ? "    return " : "    ";
                call += "d_ptr->" + command.name + "(";
                var firstParam = true;
                command.params.forEach(function (param) {
                    if (!firstParam)
                        call += ", ";
                    else
                        firstParam = false;
                    call += param.name;
                });
                call += ");";
                console.log(call);
                console.log("}\n");
            } else if (opts.options.header) {
                console.log("    " + command.type + " " + command.name + "(" + typedParamList + ");");
            } else if (opts.options.pimpl) {
                console.log("    " + command.name + " = reinterpret_cast<PFN_" + command.name + ">(inst->getInstanceProcAddr(\"" + command.name + "\"));");
            } else if (opts.options.pheader) {
                console.log("    PFN_" + command.name + " " + command.name + ";");
            }
        });
        console.log("// ----- Autogenerated section end");
    });
}

main();