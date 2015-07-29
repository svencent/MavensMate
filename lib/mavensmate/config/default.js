module.exports = {
  mm_workspace: {
    title: 'Workspaces',
    description: 'Comma-separated list of workspaces (must be absolute paths!)',
    type: 'array',
    default: [],
    order: 10
  },
  mm_subl_location : {
    title: 'Sublime Text location',
    description: 'Full path of your Sublime Text executable',
    type: 'object',
    order: 11,
    default: {
      "windows": "C:\\Program Files\\Sublime Text 3\\sublime_text.exe",
      "linux": "/usr/bin/subl",
      "osx": "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl"
    }
  },
  mm_api_version: {
    title: 'Salesforce.com API Version',
    description: '',
    type: 'string',
    default: '32.0',
    order: 20
  },
  mm_compile_on_save: {
    title: 'Compile files on save',
    description: '',
    type: 'boolean',
    default: true,
    order: 30
  },
  mm_compile_check_conflicts: {
    title: 'Check for conflicts when compiling Apex/Visualforce metadata',
    description: '',
    type: 'boolean',
    default: false,
    order: 35
  },
  mm_timeout: {
    title: 'Timeout (in seconds) for MavensMate commands',
    description: '',
    type: 'integer',
    default: 300,
    order: 40
  },
  mm_default_subscription: {
    title: 'Default metadata subscription',
    description: 'Comma-separated list of metadata types, e.g. ApexClass, ApexPage, CustomObject, StaticResource',
    type: 'array',
    default: ['ApexClass', 'ApexComponent', 'ApexPage', 'ApexTrigger', 'StaticResource'],
    order: 50
  },
  mm_use_keyring: {
    title: 'Use keyring',
    description: 'Set to true if you would like MavensMate to use your machine\'s keyring support to store/retrieve Salesforce.com credentials. If set to false, MavensMate will store passwords in plain text in your project\'s config/.settings and config/.org_connections files.',
    type: 'boolean',
    default: true,
    order: 60
  },
  mm_log_location: {
    title: 'Plugin debug logs location',
    description: 'Path where MavensMate will put logs',
    type: 'string',
    default: '',
    order: 70
  },
  mm_log_level: {
    title: 'Plugin log level',
    description: 'INFO, WARN, DEBUG, VERBOSE, SILLY',
    type: 'string',
    default: 'DEBUG',
    order: 80
  },
  mm_play_sounds: {
    title: 'Play sounds',
    description: 'Set to true if you would like MavensMate to play notification sounds',
    type: 'boolean',
    default: true,
    order: 90
  },
  mm_panel_height: {
    title: 'Panel height',
    description: '',
    type: 'integer',
    default: 200,
    order: 100
  },
  mm_close_panel_on_successful_operation: {
    title: 'Close panel on successful operation',
    description: '',
    type: 'boolean',
    default: true,
    order: 110
  },
  mm_close_panel_delay: {
    title: 'Close panel delay',
    description: 'Delay in milliseconds before panel closes on successful operation',
    type: 'integer',
    default: 1000,
    order: 120
  },
  mm_template_location: {
    title: 'MavensMate template location',
    description: '"remote" or "local"',
    type: 'string',
    default: 'remote',
    order: 130
  },
  mm_template_source: {
    title: 'MavensMate template source',
    description: 'Only GitHub is supported today',
    type: 'string',
    default: 'joeferraro/MavensMate-Templates/master',
    order: 140
  },
  mm_atom_exec_path: {
    title: 'Path to atom executable',
    description: '',
    type: 'string',
    default: '/usr/local/bin/atom',
    order: 150
  },
  mm_ignore_managed_metadata: {
    title: 'Ignore managed metadata',
    description: '',
    type: 'boolean',
    default: true,
    order: 160
  },
  mm_apex_file_extensions: {
    title: 'Salesforce file extensions',
    description: '',
    type: 'array',
    default: [".page", ".component", ".cls", ".object", ".trigger", ".layout", ".resource", ".remoteSite", ".labels", ".app", ".dashboard", ".permissionset", ".workflow", ".email", ".profile", ".scf", ".queue", ".reportType", ".report", ".weblink", ".tab", ".letter", ".role", ".homePageComponent", ".homePageLayout", ".objectTranslation", ".flow", ".datacategorygroup", ".snapshot", ".site", ".sharingRules", ".settings", ".callCenter", ".community", ".authProvider", ".customApplicationComponent", ".quickAction", ".approvalProcess", ".html"],
    order: 170
  },
  mm_community_api_token: {
    title: 'MavensMate Community API token',
    description: '(placeholder for future functionality)',
    type: 'string',
    default: '',
    order: 180
  },
  mm_http_proxy: {
    title: 'HTTP Proxy',
    description: '(placeholder for future functionality)',
    type: 'string',
    default: '',
    order: 190
  },
  mm_https_proxy: {
    title: 'HTTPS Proxy',
    description: '(placeholder for future functionality)',
    type: 'string',
    default: '',
    order: 200
  }
};