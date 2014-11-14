public class LeadDistributor_Configuration_Controller {
	
	public boolean isactive {get;set;}
	public leaddistributionsystem__c lead_distro {get;set;}
	public string selectedIdArrayString {get;set;} 
	public string conflictLeadOwnersString {get;set;} 
	
	public string store {get;set;}
	public string conflictStore {get;set;}
	public string user_select_string {get;set;}
	public string manually_distribute_ownerid {get;set;}
	
	public list<lead> leads {get;set;}
	public list<lead> conflict_leads {get;set;}

	public LeadDistributor_Configuration_Controller() {
		lead_distro = [select id, isactive__c from leaddistributionsystem__c where name = 'Lead Distribution' limit 1];	
		this.isactive = lead_distro.isactive__c;
		
		string user_select_html = '<div style="width:100%;padding:5px;">Assign the selected leads to: <select id="select_manual_distribution">';		
		for (user u : [select id, name from user where isactive = true order by name])
			user_select_html += '<option value="'+u.id+'">' +u.name+ '</option>';	
		
		for (queuesobject q : [select id, queueid, queue.name from queuesobject where sobjecttype = 'Lead' and queue.name != 'Conflicts' and queue.name != 'Disqualified' order by queue.name])
			user_select_html += '<option value="'+q.queueid+'">' +q.queue.name+ '</option>';	
			
		user_select_html += '</select><input class="btn" type="button" value="OK" onclick="click_manual_distribute_page_reference_button()"/></div>';		
		this.user_select_string = user_select_html;
    }
    
    public lead[] getReviewRoomLeads() {
    	system.debug('getting review rooms leads');
    	if (leads != null) this.leads.clear();
    	this.leads = [select id, firstname, lastname, ownerid, owner.name, email, company, createddate from lead where owner.name = 'Review Room' and isconverted = false order by createddate desc];
		
		string myDataString = 'var myData = [ ';
		
		for(lead l : this.leads) {
			
				string firstname = '';
				string lastname = '';
				string company = '';
				string email = '';
				string ownername = l.owner.name;
				string createddate = string.valueof(l.createddate);
				
				if (l.firstname != null)
					firstname = string.escapeSingleQuotes(l.firstname);
				if (l.lastname != null)
					lastname = string.escapeSingleQuotes(l.lastname);
				if (l.company != null)
					company = string.escapeSingleQuotes(l.company);
				if (l.email != null)
					email = string.escapeSingleQuotes(l.email);
				
			
			myDataString += '[\''+l.Id+'\',\''+firstname+'\',\''+lastname+'\',\''+company+'\',\''+l.Email+'\',\''+ownername+'\',\''+createddate+'\',\'<a href="/'+l.Id+'" target=new>View</a>\'],';
		}
		
		myDataString += '];';
		myDataString = myDataString.replace(',];', '];');
		
		this.store = myDataString;
		
		return this.leads;
    }
        
    public lead[] getConflictLeads() {
    	
		system.debug('getting conflict leads');
    	if (this.conflict_leads != null) this.conflict_leads.clear();
    	this.conflict_leads = [select id, firstname, lastname, ownerid, owner.name, email, company, createddate, conflict_array__c from lead where owner.name = 'Conflicts' and isconverted = false order by createddate desc];
		system.debug('the conflicts are: ' + this.conflict_leads);
		if (this.conflict_leads.size() > 0) {
			string myDataString = 'var conflictData = [ ';
			for(lead l : this.conflict_leads) {
				if (l.conflict_array__c == null)
					continue;
					
				string matching_list = '<div style="margin-top:10px;"><table><tr><td style="font-weight:bold;border-bottom:1px solid #ccc;" colspan="2">Matches<td></tr>';
				string select_string = '<select style="width:200px;" name="select_conflict" id="'+l.id+'">';
				select_string += '<option value="#">Select an owner</option>';
				string[] conflictArray = l.conflict_array__c.split(';');
				for (integer i=0;i<conflictArray.size();i++) {
					string foo = conflictArray[i];
					string possible_owner_id = foo.substring(0, foo.indexof('/'));
					string owner_label = foo.substring(foo.indexof('/')+1,foo.indexof(':'));
					string matching_leadid = foo.substring(foo.indexof(':')+1, foo.length());
					string option_value = possible_owner_id + ';' + matching_leadid;
					select_string+= '<option value="'+option_value+'">';
					select_string+= owner_label;
					select_string+= '</option>';
					matching_list += '<tr><td>'+owner_label+'</td><td><a href="/'+matching_leadid+'" target=new>View Match</a></td></tr>';
				}
				matching_list += '</table></div>';
				select_string += '</select>';
				select_string += '<br />' + matching_list;
				
				string firstname = '';
				string lastname = '';
				string company = '';
				string email = '';
				string ownername = l.owner.name;
				
				if (l.firstname != null)
					firstname = string.escapeSingleQuotes(l.firstname);
				if (l.lastname != null)
					lastname = string.escapeSingleQuotes(l.lastname);
				if (l.company != null)
					company = string.escapeSingleQuotes(l.company);
				if (l.email != null)
					email = string.escapeSingleQuotes(l.email);
					
				
				myDataString += '[\''+l.Id+'\',\''+firstname+'\',\''+lastname+'\',\''+company+'\',\''+email+'\',\''+ownername+'\',\''+l.CreatedDate+'\',\'<a href="/'+l.Id+'" target=new>View</a>\', \''+select_string+'\'],';
				
			}
			myDataString += '];';
			myDataString = myDataString.replace(',];', '];');
			this.conflictStore = myDataString;
		}
		system.debug('the conflictstore is: ' + this.conflictStore);
		return this.conflict_leads;
    }
            
    public leaddistribution__c[] getRecentDistros() {
    	datetime three_days_ago = datetime.now().adddays(-3);
    	leaddistribution__c[] distros = [Select Id, Name, Number_of_Leads__c, Initiated_By__r.Name, Distribution_Date_Time__c From LeadDistribution__c where Distribution_Date_Time__c >= :three_days_ago order by Distribution_Date_Time__c desc limit 200];
    	return distros;	
    }
    
    
    public PageReference distributeLeads() {
    	if (selectedIdArrayString != null) {
    		string[] ids = selectedIdArrayString.split(';');
    		set<id> leads = new set<id>();
    		for (integer i=0;i<ids.size();i++) {
    			leads.add(ids[i]);	
    		}
    		
    		LeadAssignment.assignLeadsByRoundRobin(leads, true);	
    	}   	
    	return null;
    }
    
    public PageReference disqualifyLeads() {
    	if (selectedIdArrayString != null) {
    		string[] ids = selectedIdArrayString.split(';');
    		set<id> leads = new set<id>();
    		for (integer i=0;i<ids.size();i++) {
    			leads.add(ids[i]);	
    		}
    		 
    		LeadAssignment.disqualifyLeads(leads);	
    	}   	
    	return null;
    }
    
    public PageReference manually_distribute_leads() {
    	if (selectedIdArrayString != null) {
    		string[] ids = selectedIdArrayString.split(';');
    		set<id> leads = new set<id>();
    		
    		for (integer i=0;i<ids.size();i++)
    			leads.add(ids[i]);
    			
    		lead[] leads_to_update = new lead[]{};
    		for (lead l : [select id from lead where id in :leads]) {
    			l.ownerid = manually_distribute_ownerid;
    			if (l.ownerid == '00G4000000105nf')
    				l.status = 'Disqualified';
    			
    			leads_to_update.add(l);	
    		}
    		update leads_to_update;
    	}   	
    	return null;
    }
    
    public PageReference distribute_conflict_leads() {
    	if (conflictLeadOwnersString != null) {
    		//  lead/new owner;
    		set<id> lead_ids = new set<id>();
    		list<lead> leads_to_update = new list<lead>();
    		map<string, string> leadid_to_new_owner_map = new map<string, string>();
    		string[] leads_with_new_assignment = conflictLeadOwnersString.split(';');
    		
			for (integer i=0;i<leads_with_new_assignment.size();i++) {
				string string_to_parse = leads_with_new_assignment[i];
				string leadid = string_to_parse.substring(0, string_to_parse.indexof('/'));
				string ownerid = string_to_parse.substring(string_to_parse.indexof('/')+1, string_to_parse.length());
    			leadid_to_new_owner_map.put(leadid, ownerid);	
    		} 
    		
    		for (lead l : [select id from lead where id in :leadid_to_new_owner_map.keyset()]) {
    			l.ownerid = leadid_to_new_owner_map.get(l.id);
    			l.distribution_status__c = 'Conflict Manually Distributed';
    			leads_to_update.add(l);
    		}
    		update leads_to_update; 
    	}   	
    	return null;
    }	
    
    public pageReference refreshPage() {
    	if (leads != null) this.leads.clear();
    	this.leads = [select id, firstname, lastname, ownerid, owner.name, email, company, createddate from lead where owner.name = 'Review Room' and isconverted = false order by createddate desc];
		
		string myDataString = 'var myData = [ ';
		for(lead l : this.leads) {
			myDataString += '[\'{!l.Id}\',\'{!l.FirstName}\',\'{!l.LastName}\',\'{!l.Company}\',\'{!l.Email}\',\'{!l.Owner.Name}\',\'{!l.CreatedDate}\',\'<a href="/{!l.Id}">View</a>\'],';
		}
		myDataString += '];';
		myDataString = myDataString.replace(',];', '];');
		this.store = myDataString;
		
		this.getConflictLeads();
		
		return null;
    }
       

    public class queueMember {
    	
    	public LeadQueueMember__c member {get;set;}
    	public QueueMemberVacation__c[] vacations;
    	
    	public queueMember(LeadQueueMember__c member) {
    		this.member = member;
    		this.vacations = [select id from QueueMemberVacation__c where lead_queue_member__c = :this.member.id and start_date__c <= :system.now() and end_date__c >= :system.now() order by start_date__c desc limit 1];
    	}
    	
    	public boolean getIsActive() {
    		if (this.vacations.size() > 0 || this.member.isactive__c == false)
    			return false;
			else 
				return true;
    	}
    	
    	public string getActiveVacationId() {
    		return vacations[0].id;	
    	}
    	
    	public string getLastRoundRobin() {
    		if (this.member.last_round_robin_assignment__c != null)
    			return this.member.last_round_robin_assignment__c.format();
			else
				return 'This user has never been assigned a round robin lead';
    	}	
    }
    
    public queueMember[] getQueueMembers() {
    	LeadQueueMember__c[] members = [select id, name, user__c, user__r.name, user__r.lastname, isactive__c, last_round_robin_assignment__c, round_robin_member__c from LeadQueueMember__c order by user__r.lastname];
    	list<queueMember> queue_members = new list<queueMember>();
    	for (LeadQueueMember__c m : members) {
    		queueMember qm = new queueMember(m);
    		queue_members.add(qm);	
    	}
    	return queue_members; 
    }
    
    public list<QueueMemberVacation__c> getUpcomingVacation() {
    	return [select id from QueueMemberVacation__c where lead_queue_member__c = :System.currentPageReference().getParameters().get('queueMemberId') and start_date__c <= :system.now()];
    }
            
    public pageReference setLeadDistributorStatus() {
		lead_distro.isactive__c = !lead_distro.isactive__c;
		isactive = !isactive;
		update lead_distro;
    	return null;	
    } 
}