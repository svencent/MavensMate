module.exports = {
  mm_workspace: {
    title: 'Workspaces',
    description: 'Array of local workspaces. These should be absolute paths.',
    type: 'array',
    default: [],
    order: 10
  },
  mm_api_version: {
    title: 'Salesforce API Version',
    description: 'The API version you would like to use when accessing the Salesforce APIs.',
    type: 'string',
    default: '33.0',
    order: 20
  },
  mm_compile_on_save: {
    title: 'Compile on save',
    description: 'Set to true if you would like MavensMate to compile metadata to Salesforce when saving metadata.',
    type: 'boolean',
    default: true,
    order: 30
  },
  mm_compile_check_conflicts: {
    title: 'Check conflicts before compile',
    description: 'Set to true to check for conflicts when compiling Apex/Visualforce metadata.',
    type: 'boolean',
    default: true,
    order: 35
  },
  mm_timeout: {
    title: 'Timeout, in seconds',
    description: 'Timeout (in seconds) for MavensMate commands.',
    type: 'integer',
    default: 600,
    order: 40
  },
  mm_default_subscription: {
    title: 'Default metadata subscription',
    description: 'Array of metadata types that should be included in every new MavensMate project, e.g. ApexClass, ApexPage, CustomObject, StaticResource',
    type: 'array',
    default: ['ApexClass', 'ApexComponent', 'ApexPage', 'ApexTrigger', 'StaticResource'],
    order: 50
  },
  mm_ignore_managed_metadata: {
    title: 'Ignore managed metadata',
    description: 'Set to true to prevent managed metadata from being downloaded to your MavensMate projects',
    type: 'boolean',
    default: true,
    order: 160
  },
  mm_use_keyring: {
    title: 'Use keyring',
    description: 'Set to true if you would like MavensMate to use your machine\'s keychain support to store/retrieve Salesforce.com credentials. If set to false, MavensMate will store passwords in plain text in your project\'s config/.settings and config/.org_connections files.',
    type: 'boolean',
    default: true,
    order: 60
  },
  mm_subl_location : {
    title: 'Sublime Text location',
    description: 'The full path of your Sublime Text executable (Sublime Text users only).',
    type: 'object',
    order: 11,
    default: {
      "windows": "C:\\Program Files\\Sublime Text 3\\sublime_text.exe",
      "linux": "/usr/bin/subl",
      "osx": "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl"
    }
  },
  mm_atom_exec_path: {
    title: 'Atom executable location',
    description: 'The full path to atom executable (Atom users only).',
    type: 'string',
    default: {
      "windows": "C:\\Program Files\\Atom\\Atom.exe",
      "linux": "/usr/bin/subl",
      "osx": "usr/local/bin/atom"
    },
    order: 150
  },
  mm_log_location: {
    title: 'MavensMate logs location',
    description: 'Full path to the location where you would like MavensMate to store its logs. When this and mm_log_level are set, MavensMate will write logs to this path with the file name mavensmate.log. Relevant logs should be included with any bug reports.',
    type: 'string',
    default: '',
    order: 70
  },
  mm_log_level: {
    title: 'Plugin log level',
    description: 'Possible values: INFO, WARN, DEBUG, VERBOSE, SILLY',
    type: 'string',
    default: 'DEBUG',
    order: 80
  },
  mm_play_sounds: {
    title: 'Play sounds',
    description: 'Set to true if you would like MavensMate to play notification sounds on events like deployments, unit tests, etc.',
    type: 'boolean',
    default: true,
    order: 90
  },
  mm_template_location: {
    title: 'MavensMate templates location',
    description: 'Possible values: remote or local. Set to "remote" when templates should be sourced from GitHub. Set to "local" if you have cloned MavensMate-Templates locally and wish to source templates from your local file system.',
    type: 'string',
    default: 'remote',
    order: 130
  },
  mm_template_source: {
    title: 'MavensMate template source',
    description: 'If "mm_template_location" is set to "local", set this to the absolute location of the directory where you\'ve forked the MavensMate-Templates project. Example: "/path/on/your/machine/to/templates". If "mm_template_location" is set to "remote", set to github location. Example: "username/reponame/branchname". Project structure must be in the format found here: https://github.com/joeferraro/MavensMate-Templates',
    type: 'string',
    default: 'joeferraro/MavensMate-Templates/master',
    order: 140
  },
  mm_apex_file_extensions: {
    title: 'Salesforce file extensions',
    description: 'Array of file extensions that should be considered "Salesforce" file extensions.',
    type: 'array',
    default: [".page", ".component", ".cls", ".object", ".trigger", ".layout", ".resource", ".remoteSite", ".labels", ".app", ".dashboard", ".permissionset", ".workflow", ".email", ".profile", ".scf", ".queue", ".reportType", ".report", ".weblink", ".tab", ".letter", ".role", ".homePageComponent", ".homePageLayout", ".objectTranslation", ".flow", ".datacategorygroup", ".snapshot", ".site", ".sharingRules", ".settings", ".callCenter", ".community", ".authProvider", ".customApplicationComponent", ".quickAction", ".approvalProcess", ".html"],
    order: 170
  },
  // mm_community_api_token: {
  //   title: 'MavensMate Community API token',
  //   description: '(placeholder for future functionality)',
  //   type: 'string',
  //   default: '',
  //   order: 180
  // },
  mm_http_proxy: {
    title: 'HTTP Proxy',
    description: 'Set if you are behind a proxy (you can also set via export HTTP_PROXY, export HTTPS_PROXY). Example: http:\/\/10.10.1.10:3128 or http:\/\/user:pass@10.10.1.10:3128/',
    type: 'string',
    default: '',
    order: 190
  },
  mm_https_proxy: {
    title: 'HTTPS Proxy',
    description: 'Set if you are behind a proxy (you can also set via export HTTP_PROXY, export HTTPS_PROXY). Example: http:\/\/10.10.1.10:3128 or http:\/\/user:pass@10.10.1.10:3128/',
    type: 'string',
    default: '',
    order: 200
  }
};