var childMetadata = [
  {"xmlName" : "CustomField", "tagName" : "fields", "parentXmlName" : "CustomObject" },
  {"xmlName" : "BusinessProcess", "tagName" : "businessProcesses", "parentXmlName" : "CustomObject" },
  {"xmlName" : "RecordType", "tagName" : "recordTypes", "parentXmlName" : "CustomObject" },
  {"xmlName" : "WebLink", "tagName" : "webLinks", "parentXmlName" : "CustomObject" },
  {"xmlName" : "ValidationRule", "tagName" : "validationRules", "parentXmlName" : "CustomObject" },
  {"xmlName" : "NamedFilter", "tagName" : "namedFilters", "parentXmlName" : "CustomObject" },
  {"xmlName" : "SharingReason", "tagName" : "sharingReasons", "parentXmlName" : "CustomObject" },
  {"xmlName" : "ListView", "tagName" : "listViews", "parentXmlName" : "CustomObject" },
  {"xmlName" : "FieldSet", "tagName" : "fieldSets", "parentXmlName" : "CustomObject" },
  {'xmlName' : 'ActionOverride', 'tagName' : 'actionOverrides', 'parentXmlName' : 'CustomObject' },
  {'xmlName' : 'CompactLayout', 'tagName' : 'compactLayouts', 'parentXmlName' : 'CustomObject' },
  {'xmlName' : 'SharingRecalculation', 'tagName' : 'sharingRecalculations', 'parentXmlName' : 'CustomObject' },
  {"xmlName" : "CustomLabel", "tagName" : "customLabels", "parentXmlName" : "CustomLabels" },
  {'xmlName' : 'SharingCriteriaRule', 'tagName' : 'sharingCriteriaRules', 'parentXmlName' : 'SharingRules' },
  {'xmlName' : 'SharingOwnerRule', 'tagName' : 'sharingOwnerRules', 'parentXmlName' : 'SharingRules' },
  {'xmlName' : 'SharingTerritoryRule', 'tagName' : 'sharingTerritoryRules', 'parentXmlName' : 'SharingRules' },
  {"xmlName" : "WorkflowAlert", "tagName" : "alerts", "parentXmlName" : "Workflow" },
  {"xmlName" : "WorkflowTask", "tagName" : "tasks", "parentXmlName" : "Workflow" },
  {"xmlName" : "WorkflowOutboundMessage", "tagName" : "outboundMessages", "parentXmlName" : "Workflow" },
  {"xmlName" : "WorkflowFieldUpdate", "tagName" : "fieldUpdates", "parentXmlName" : "Workflow" },
  {"xmlName" : "WorkflowRule", "tagName" : "rules", "parentXmlName" : "Workflow" },
  {"xmlName" : "WorkflowEmailRecipient", "tagName" : "emailRecipients", "parentXmlName" : "Workflow" },
  {"xmlName" : "WorkflowTimeTrigger", "tagName" : "timeTriggers", "parentXmlName" : "Workflow" },
  {"xmlName" : "WorkflowActionReference", "tagName" : "actionReferences", "parentXmlName" : "Workflow" }
];

function renderBufferedTree(metadata) {
	console.log('rendering tree!');
	console.log(metadata);

	try {
		$('#tree').dynatree('destroy');
	} catch(e) {}

  $.each( metadata, function( key, value ) {
    value.text = value.xmlName;
    value.title = value.xmlName;
    value.key = value.xmlName;
    value.folder = true;
    value.checked = false;
    value.select = false;
    value.children = [];
    value.cls = 'folder';
    value.isLazy = true;
    value.isFolder = true;
    value.level = 1;
    value.id = value.xmlName;
  });

	tree = $('#tree').dynatree({
		ajaxDefaults: { // Used by initAjax option
      timeout: 600000, // >0: Make sure we get an ajax error for invalid URLs
    },
		children: metadata,
		checkbox: true,
		selectMode: 3,
		debugLevel: 0,
		persist: false,
		onLazyRead: function(node) {
      $.ajax({
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        url: baseLocalServerURL+'/execute?async=1',
        data: JSON.stringify({
					metadataTypes: [ node.data.title ],
					accessToken: $('#accessToken').val(),
          refreshToken: $('#refreshToken').val(),
					instanceUrl: $('#instanceUrl').val(),
					command: 'list-metadata'
				}),
        error: function(req, textStatus, errorThrown) {
          handleAjaxError(req, textStatus, errorThrown);
        },
        success: function(data, status, xhr) {
          listMetadataResponseHandler(data, node);
        }
      });
	 	}
	});
	tree = $('#tree').dynatree('getTree');
}

function listMetadataResponseHandler(data, node) {
  console.log(data);
  console.log('node:', node);
  try {
    checkListStatus(data.id, node);
  } catch(e) {
    showGlobalError('The local MavensMate server did not respond properly. This likely means it is not running or it is malfunctioning. Try restarting your text editor and MavensMate Desktop.');
    hideLoading();
  }
}

function handleAjaxError(req, textStatus, errorThrown) {
  console.error(req, textStatus, errorThrown);
  hideLoading();
  showGlobalError('Request failed with status code '+req.status+'<br/>'+req.responseText);
}

function checkListStatus(requestId, node) {
  $.ajax({
    type: 'GET',
    url: baseLocalServerURL+'/execute/'+requestId,
    data: { id: requestId },
    dataType: 'json',
    error: function(req, textStatus, errorThrown) {
      handleAjaxError(req, textStatus, errorThrown);
    },
    success: function(data, status, xhr) {
      try {
        console.log('checking status of async list metadata request');
        console.log(data);
        if (data.status === 'pending') {
          setTimeout(function() { checkListStatus(requestId, node); }, CHECK_STATUS_INTERVAL); //poll for completed async request
        } else {
          handleListResponse(data, node);
        }
      } catch(e) {
        console.error(e);
        showGlobalError('Error listing metadata: '+e.message);
      }
    }
  });
}

function handleListResponse(data, node) {
  console.log('processing list-metadata response');
  console.log(data);
  try {
    node.setLazyNodeStatus(DTNodeStatus_Ok);
    node.addChild(data.result[0].children);
  } catch(e) {
    console.log(e);
    return [];
  }
}

function isArray(what) {
  return Object.prototype.toString.call(what) === '[object Array]';
}

//if dom elements is removed, we need to resize the window
function resizeWindowOnDomElementRemoved() {
	$( "body" ).bind(
		"DOMNodeRemoved",
		function( event ) {
			if (event.target.id === "result_wrapper") {
				$("#project_details_tab").click();
			}
		}
	);
}

//submit form on enter
function submitFormOnEnter() {
	$('.content').bind('keyup', function(e) {
		var code = (e.keyCode ? e.keyCode : e.which);
		 if(code == 13) { //enter pressed
			$('#btnSubmit').click();
		 }
	});
}

$.expr[':'].Contains = function(a, i, m) {
	return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
};