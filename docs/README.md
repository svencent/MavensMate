# [MavensMate](http://mavensmate.com) - Open Source IDEs for Salesforce

MavensMate is a collection of open source projects that aim to make building Salesforce applications accessible to developers who prefer to build applications using their local machine in text editors like Sublime Text, Atom, and Visual Studio Code. Because there are several MavensMate projects, it can be somewhat confusing. In essence, there are three main components to the architecture: the server, the desktop wrapper, and the editor plugins.

<img width="851" alt="mavensmate-architecture" src="https://cloud.githubusercontent.com/assets/54157/17833532/27343ec4-66ee-11e6-80ae-f8b56e7b990f.png">

- [MavensMate Server](#mavensmate-server)
- [MavensMate Desktop](#mavensmate-app)
- [Editor Plugins](#editor-plugins)
- [Node Module](#node-module)
- [Command Line Interface](#command-line-interface)

## MavensMate Server

MavensMate Server is a local Node.js Express server that facilitates communication/integration between editors like Sublime Text, Atom, and Visual Studio Code, the local file system, and the Salesforce servers. When a plugin requests a command to be run (e.g. "compile a file"), a local HTTP request is made to MavensMate Server, the server executes the requested command (which often requires communicating with a remote Salesforce.come environment) and returns the response to the plugin.

- **Documentation**: https://github.com/joeferraro/MavensMate-app
- **GitHub Project**: https://github.com/joeferraro/MavensMate

## MavensMate Desktop (MavensMate.app)

MavensMate-app is an application that bundles the local MavensMate server into a desktop application that powers the MavensMate Sublime Text, Atom, and Visual Studio Code plugins.

- **Documentation**: https://github.com/joeferraro/MavensMate-app
- **GitHub Project**: https://github.com/joeferraro/MavensMate-app

## Plugins

### MavensMate for Sublime Text

- **Documentation**: https://github.com/joeferraro/MavensMate-app
- **GitHub Project**: https://github.com/joeferraro/MavensMate-SublimeText

### MavensMate for Atom (beta)

- **Documentation**: https://github.com/joeferraro/MavensMate-app
- **GitHub Project**: https://github.com/joeferraro/MavensMate-Atom

### MavensMate for Visual Studio Code (coming soon)

- **Documentation**: https://github.com/joeferraro/MavensMate-app
- **GitHub Project**: https://github.com/joeferraro/MavensMate-VisualStudioCode

## Contributors

- [Joseph Ferraro] (http://github.com/joeferraro)
- [Ralph Callaway] (http://github.com/ralphcallaway)
- [Kyle Thornton] (http://github.com/kylethornton)
- [David Helmer] (http://github.com/kidtsunami)
- [Justin Silver] (http://github.com/doublesharp)

#FAQ

- [Frequently Asked Questions](faq)
