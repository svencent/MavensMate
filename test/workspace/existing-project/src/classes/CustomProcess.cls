global class CustomProcess 
{
	public static String initialComments;
	
	webservice static void doNewIntake(List<Opportunity> myOpps, String processType, String comments, String userId) 
	{ 
		Boolean isSuccess;
		Boolean stepSuccess;
		String newApprovalId;
		initialComments = comments;
		List<Custom_Process_Instance__c> myCustomProcesses = new List<Custom_Process_Instance__c>();
		
		for (Opportunity o: myOpps)
		{
		
			//create a new Custom_Approval__c object (this object is the parent of the approvals steps created below)
			Custom_Process_Instance__c cpi = new Custom_Process_Instance__c(
				Generated_Name__c = o.name + ' (' + processType + ')',
				Opportunity__c = o.id,
				Type__c = processType,
				Status__c = 'Pending'
			);
			
			myCustomProcesses.add(cpi);
		}
		
		insert myCustomProcesses;		
		insertSteps(myCustomProcesses);
		sendEmail(myCustomProcesses);
	}
	
	public static void insertSteps(List<Custom_Process_Instance__c> myCPIs) 
	{ 
		//this method simply inserts the custom approval steps based on the steps in the custom process step objects
		List<Custom_Process_Step__c> mySteps = new List<Custom_Process_Step__c>();
		List<Custom_Process_Instance_Step__c> myInstanceSteps = new List<Custom_Process_Instance_Step__c>();
		String comments = 'shoo';
		
		//first gather the steps, put them into a list
		for (custom_process_step__c ps : [select name, actor__c, step_number__c from custom_process_step__c where custom_process__r.name = 'Offer Generation' order by step_number__c asc]) 
		{
			mySteps.add(ps);
		}
		
		for (Custom_Process_Instance__c cpi : myCPIs)
		{
			Boolean isPending = false;
			Integer i = 1;
			DateTime myDt;
			String status;
			String myComments;
			
			for (Custom_Process_Step__c cps : mySteps)
			{
				if (i == 1)
				{
					isPending = true;
					myDt = DateTime.now();
					status = 'Pending';
					myComments = initialComments;
				}
				else
				{
					myDt = null;
					isPending = false;
					status = '';
					myComments = '';
				}
					 
				Custom_Process_Instance_Step__c cas = new Custom_Process_Instance_Step__c(
					name = cps.name,
					custom_process_instance__c = cpi.id,
					Step_Number__c = cps.step_number__c,
					Assigned_To__c = cps.actor__c,
					IsPending__c = isPending,
					Comments__c = myComments,
					Status__c = status,
					Date__c = myDt
					);
					
				myInstanceSteps.add(cas);
				i++;
			}	
		}
		
		insert myInstanceSteps;

	}
	
	
	webService static void handleAction(List<Opportunity> myOpps, String action, String actor, String comments) 
	{ 
		List<Custom_Process_Instance_Step__c> mySteps = new List<Custom_Process_Instance_Step__c>();
		List<Custom_Process_Instance__c> myInstances = [Select id, (Select id, step_number__c, status__c, name from Custom_Process_Instance_Step__r order by step_number__c asc) from Custom_Process_Instance__c where Opportunity__c in :myOpps and Status__c = 'Pending'];
		Double currentStepNumber = 0;
		Boolean skip = false;
		
		for (Custom_Process_Instance__c cpi : myInstances)
		{
			Integer numberOfSteps = cpi.Custom_Process_Instance_Step__r.size();
			for (Custom_Process_Instance_Step__c cpis : cpi.Custom_Process_Instance_Step__r)
			{
				String processId = cpi.Id;
				
				//check to see if this is the final step of the process
				if (cpis.status__c == 'Pending' && cpis.step_number__c == numberOfSteps)
				{
					skip = true;
					cpis.Status__c = 'Completed';
					cpis.IsPending__c = false;
					cpis.Date_Completed__c = DateTime.now();
					cpis.Comments__c = comments;
					mySteps.add(cpis);
					break;
				}
				//get process steps that are pending and mark as 'complete'
				else if (cpis.status__c == 'Pending')
				{
					currentStepNumber = cpis.step_number__c;
					cpis.Status__c = 'Completed';
					cpis.IsPending__c = false;
					cpis.Date_Completed__c = DateTime.now();
					cpis.Comments__c = comments;
					mySteps.add(cpis);	
				}
			}
			if (skip == false)
			{
				for (Custom_Process_Instance_Step__c cpis : cpi.Custom_Process_Instance_Step__r)
				{
					if (cpis.step_number__c == (currentStepNumber + 1))
					{
						//new active step
						cpis.Status__c = 'Pending';
						cpis.IsPending__c = true;
						cpis.Date__c = DateTime.now();	
						mySteps.add(cpis);	
					}
				}
			}
		}
		
		update mySteps;
		
		if (skip == true)
			doFinal(myInstances);

	}
	
	public static void doFinal(List<Custom_Process_Instance__c> myCPIs)
	{
		for (Custom_Process_Instance__c cpi : myCPIs)
		{
			cpi.Status__c = 'Completed';
		}
		
		update myCPIs;
	}

	public static void sendEmail(List<Custom_Process_Instance__c> myCPIs)
	{
		List<Custom_Process_Instance__c> theCPIs = [Select id, opportunity__c, opportunity__r.name, type__c, createdby.name from custom_process_instance__c where id in :myCPIs];
		
		System.assert(myCPIs.size() <= 10);
		for (Custom_Process_Instance__c cpi : theCPIs)
		{
			String html = '<p>' + cpi.CreatedBy.Name + ' has launched the ' + cpi.Type__c + ' process for ' + cpi.Opportunity__r.Name + '</p>';
			html += '<p>For more information, see  <a href="https://na5.salesforce.com/'+cpi.Opportunity__c+'">'+cpi.Opportunity__r.Name+'</a></p>';
			String subject = cpi.CreatedBy.Name + ' has launched the ' + cpi.Type__c + ' process for ' + cpi.Opportunity__r.Name;
			
			//TODO DYNAMIC EMAILING
			String[] toAddresses = new String[] {'jf317820@gmail.com'};
			Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
			mail.setToAddresses(toAddresses);
			mail.setSubject(subject);
			mail.setSenderDisplayName('Salesforce Process Alerts');
			mail.setUseSignature(false);
			mail.setHtmlBody(html);
			Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });		
		}
	}	
	
	
}