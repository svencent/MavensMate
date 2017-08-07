# [MavensMate](http://mavensmate.com) - Open Source IDEs for Salesforce

## Update: August 7, 2017

[MavensMate is no longer being actively developed or supported](http://mavensmate.com/). We recommend using Salesforce's [official Visual Studio Code plugin](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode) for building Salesforce applications.

## Overview

MavensMate is a collection of open source projects that aims to make building Salesforce applications accessible to developers who prefer to build applications using their local machine in text editors like Sublime Text, Atom, and Visual Studio Code. MavensMate is created and maintained by [Joe Ferraro](http://twitter.com/joeferraro) with support from [Mavens](https://mavens.com/?utm_source=github&utm_medium=mavensmate&utm_term=readme&utm_campaign=mavensmate%20github%20readme) and these amazing [contributors](https://github.com/joeferraro/MavensMate/tree/master/docs#contributors).

Because there are several open source MavensMate projects, it can be somewhat confusing to navigate the ecosystem. In essence, there are three main components to the architecture: the [server](https://github.com/joeferraro/MavensMate/tree/master/docs/server), the [desktop application](https://github.com/joeferraro/MavensMate-Desktop), and the [editor plugins](#plugins).

<img width="851" alt="mavensmate-architecture" src="https://cloud.githubusercontent.com/assets/54157/17834705/93204598-671a-11e6-90f2-bfb01ddbc2ad.png">

## Quickstart for Salesforce Developers

1. Download and install [MavensMate Desktop](https://github.com/joeferraro/MavensMate-Desktop/releases)
2. Choose your editor (Sublime Text 3, Atom, Visual Studio Code) and install the appropriate [MavensMate plugin](#plugins)
3. Happy coding!

## Quickstart for MavensMate Contributors

- Coming soon

## Components

- [MavensMate Server](#mavensmate-server)
- [MavensMate Desktop](#mavensmate-desktop)
- [Editor Plugins](#editor-plugins)
- [Node Module](#node-module)
- [Command Line Interface](#command-line-interface)

## MavensMate Server

[![Build Status](https://travis-ci.org/joeferraro/MavensMate.svg?branch=master)](https://travis-ci.org/joeferraro/MavensMate)
[![Coverage Status](https://coveralls.io/repos/joeferraro/MavensMate/badge.svg?branch=master)](https://coveralls.io/r/joeferraro/MavensMate?branch=master)
[![NPM Version](https://img.shields.io/npm/v/mavensmate.svg)](https://www.npmjs.org/package/mavensmate)
[![License](https://img.shields.io/npm/l/mavensmate.svg)](https://www.npmjs.org/package/mavensmate)

MavensMate Server is a local Node.js Express server that facilitates communication/integration between editors like Sublime Text, Atom, and Visual Studio Code, the local file system, and the Salesforce servers. When a plugin requests a command to be run (e.g. "compile a file"), a local HTTP request is made to MavensMate Server, the server executes the requested command (which often requires communicating with a remote Salesforce.com environment) and returns the response to the plugin.

- **Documentation**: https://github.com/joeferraro/MavensMate/tree/master/docs/server
- **GitHub Project**: https://github.com/joeferraro/MavensMate

## MavensMate Desktop

| Platform | Status |
| --- | --- |
OS X / Linux | [![Build Status](https://travis-ci.org/joeferraro/MavensMate-Desktop.svg)](https://travis-ci.org/joeferraro/MavensMate-Desktop) |
Windows | [![Build status](https://ci.appveyor.com/api/projects/status/u0i8yx97wuwylp88?svg=true)](https://ci.appveyor.com/project/joeferraro/MavensMate-Desktop) |

MavensMate Desktop is an application that bundles the local MavensMate server into a desktop application that powers the MavensMate Sublime Text, Atom, and Visual Studio Code plugins.

- **Documentation**: coming soon
- **GitHub Project**: https://github.com/joeferraro/MavensMate-Desktop

## Plugins

### MavensMate for Sublime Text

- **Documentation**: coming soon
- **GitHub Project**: https://github.com/joeferraro/MavensMate-SublimeText

### MavensMate for Atom (beta)

- **Documentation**: coming soon
- **GitHub Project**: https://github.com/joeferraro/MavensMate-Atom

### MavensMate for Visual Studio Code (coming soon)

- **Documentation**: coming soon
- **GitHub Project**: https://github.com/joeferraro/MavensMate-VisualStudioCode

## Contributors

- [Joseph Ferraro] (http://github.com/joeferraro)
- [Ralph Callaway] (http://github.com/ralphcallaway)
- [Kyle Thornton] (http://github.com/kylethornton)
- [David Helmer] (http://github.com/kidtsunami)
- [Justin Silver] (http://github.com/doublesharp)

#FAQ

- coming soon
