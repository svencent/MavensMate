# [MavensMate](http://mavensmate.com) - Open Source IDEs for Salesforce

MavensMate is a powerful tool for building Salesforce IDEs. Develop Salesforce applications in your favorite text editors, like Sublime Text, Atom, and Visual Studio Code. MavensMate is created and maintained by [Joe Ferraro](http://twitter.com/joeferraro) with help from these [contributors](#contributors).

- [MavensMate Server](#mavensmate-server)
- [MavensMate Desktop](#mavensmate-app)
- [Editor Plugins](#editor-plugins)
- [Node Module](#node-module)
- [Command Line Interface](#command-line-interface)

## MavensMate Server

The source contained in this project (https://github.com/joeferraro/MavensMate) is a local Node.js Express server that facilitates communication between editors like Sublime Text, Atom, and Visual Studio Code and the Salesforce servers.

[![Build Status](https://travis-ci.org/joeferraro/MavensMate.svg?branch=master)](https://travis-ci.org/joeferraro/MavensMate)

[![NPM Version](https://img.shields.io/npm/v/mavensmate.svg)](https://www.npmjs.org/package/mavensmate)
[![Coverage Status](https://coveralls.io/repos/joeferraro/MavensMate/badge.svg?branch=master)](https://coveralls.io/r/joeferraro/MavensMate?branch=master)

[![License](https://img.shields.io/npm/l/mavensmate.svg)](https://www.npmjs.org/package/mavensmate)

## MavensMate Desktop (MavensMate.app)

MavensMate-app is an application that bundles the local MavensMate server and UIs into a desktop app that powers the MavensMate Sublime Text and Atom plugins. For more information and to download MavensMate-app, [visit the GitHub project](https://github.com/joeferraro/MavensMate-app).

<img width="1100" alt="9_27_15__11_46_pm" src="https://cloud.githubusercontent.com/assets/54157/10146854/e8e3695c-65f8-11e5-8a41-d1b3f77b7a14.png">

## Node Module

You can build your own Salesforce IDEs by integrating with the APIs exposed in this project. For Node.js projects, you can simply `require('mavensmate')`. For other types of projects, you may use the command line interface (see below, full documentation forthcoming).

### Install

`npm install mavensmate -g`

### Usage

#### Node Application

```
var mavensmate = require('mavensmate');
var client = mavensmate.createClient({
	name: 'my-mavensmate-client'
});
client.addProjectByPath('path/to/some/project')
  .then(function(res) {
    return client.executeCommand('compile-project');
  })
  .then(function(res) {
    console.log('command result', res);
  });
});
```

#### Command Line Interface

- todo

## Plugins

### [MavensMate for Sublime Text][stp]

Build Salesforce applications from [Sublime Text 3](http://www.sublimetext.com/3)

### [MavensMate for Atom (beta)][atom]

Build Salesforce applications from [GitHub's Atom text editor](http://atom.io).

### [MavensMate for Visual Studio Code (coming soon)][vscode]

MavensMate is working with Microsoft to create an official plugin for Visual Studio Code!

## Contributors

- [Joseph Ferraro] (http://github.com/joeferraro)
- [Ralph Callaway] (http://github.com/ralphcallaway)
- [Kyle Thornton] (http://github.com/kylethornton)
- [David Helmer] (http://github.com/kidtsunami)
- [Justin Silver] (http://github.com/doublesharp)

## Documentation

MavensMate's documentation is built with [Daux.io](http://daux.io) and publicly available on [http://mavensmate.com][docs].

<img src="http://cdn.mavensconsulting.com/mavensmate/img/mm-bg.jpg"/>

[mmcom]: http://mavensmate.com/?utm_source=github&utm_medium=mavensmate&utm_campaign=api
[docs]: http://mavensmate.com/Getting_Started/Developers
[stp]: https://github.com/joeferraro/MavensMate-SublimeText
[atom]: https://github.com/joeferraro/MavensMate-Atom
[vscode]: https://github.com/joeferraro/MavensMate-VisualStudioCode