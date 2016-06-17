#Project Overview

MavensMate is a collection of open source projects that aim to make building Salesforce applications accessible to developers who prefer to develop from their local machine in text editors like Sublime Text, Atom, and Visual Studio Code. Because there are several projects, it can be somewhat confusing. In essence, there are three main components to the architecture: the server, the desktop wrapper, and the plugins.

<img width="851" alt="mavensmate-architecture" src="https://cloud.githubusercontent.com/assets/54157/16150741/f3158daa-3466-11e6-92d4-62737993c36e.png">

##MavensMate (Server)

**GitHub repo:** https://github.com/joeferraro/MavensMate

The MavensMate server is a Node.js application that runs a local Express server for facilitating communication between the HTTP-aware plugins and the MavensMate core. So, when a plugin requests a command to be run (e.g. "compile a file"), a local HTTP request is made to the MavensMate server, the server executes the requested command (which often requires communicating with a remote Salesforce.come environment) and returns the response to the plugin.

[Learn more](server)

##MavensMate-app (Desktop)

**GitHub repo:** https://github.com/joeferraro/MavensMate-app

MavensMate-app is an application that packages the MavensMate server for desktop installation. It uses an open source framework called [Electron](https://github.com/electron/electron).

[Learn more](desktop)

##Plugins

- [Sublime Text](plugins/sublime)
- [Atom](plugins/atom)
- [Visual Studio Code](plugins/vs-code)

#FAQ

Here are some questions we see quite often:

- [MavensMate FAQ](faq)