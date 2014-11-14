global class LeadAssignment {

	@future
    public static void routeLeads(set<id> leadids) {
        //this will represent all leads in this distro
        list<LeadDistributionMember__c> members_master = new list<LeadDistributionMember__c>();
    	    	
    	//initiate and insert the distro object    	
        LeadDistributionHandler router = new LeadDistributionHandler();
        router.dist.initiated_by__c = userinfo.getuserid();
        router.dist.distribution_date_time__c = system.now();
        insert router.dist; 
                  
        router.leads_to_process = [select id, email, website, company, ownerid, domain__c from lead where id in :leadids and isconverted = false];  
        
        for (lead l : router.leads_to_process) {
        	if (l.email != null) {
        		if (!router.email_to_list_of_leads_map.containskey(l.email)) {
					lead[] leads = new lead[]{l};
        			router.email_to_list_of_leads_map.put(l.email, leads);
        		} else if (router.email_to_list_of_leads_map.containskey(l.email) == true) {
        			lead[] leads = router.email_to_list_of_leads_map.get(l.email);
        			leads.add(l);
        			router.email_to_list_of_leads_map.put(l.email, leads);
        		}
        	}
        	
        	if (l.domain__c != null) {
        		if (!router.domain_to_list_of_leads_map.containskey(l.domain__c)) {
					lead[] leads = new lead[]{l};
        			router.domain_to_list_of_leads_map.put(l.domain__c, leads);
        		} else if (router.domain_to_list_of_leads_map.containskey(l.domain__c) == true) {
        			lead[] leads = router.domain_to_list_of_leads_map.get(l.domain__c);
        			leads.add(l);
        			router.domain_to_list_of_leads_map.put(l.domain__c, leads);
        		}
        	}
        } 
        
        list<LeadDistributionMember__c> lead_contact_email_matches = router.getLeadsMatchedByContactEmail(router.leads_to_process);
        
        list<LeadDistributionMember__c> lead_lead_email_matches = router.getLeadsMatchedByLeadEmail(router.leads_to_process);

        list<LeadDistributionMember__c> lead_lead_domain_matches = router.getLeadsMatchedByLeadDomain(router.leads_to_process);
        
        list<LeadDistributionMember__c> lead_account_domain_matches = router.getLeadsMatchedByAccountDomains(router.leads_to_process);
        
        list<LeadDistributionMember__c> lead_account_name_matches = router.getLeadsMatchedByAccountName(router.leads_to_process);
        
        list<LeadDistributionMember__c> round_robin_leads = router.getRoundRobinLeads(router.leads_to_process, false);
        
        list<LeadDistributionMember__c> review_room_leads = router.getReviewRoomLeads(router.leads_to_process);

        
         
        //add the contact email matches to the master member list
        members_master.addAll(lead_contact_email_matches);
        members_master.addAll(lead_lead_email_matches);
        members_master.addAll(lead_lead_domain_matches);
        members_master.addAll(lead_account_domain_matches);
        members_master.addAll(lead_account_name_matches);
        members_master.addAll(round_robin_leads);
        members_master.addAll(review_room_leads);
        
        list<lead> leads_to_update = new list<lead>();
		

		
        for (LeadDistributionMember__c member : members_master)
        	member.lead_distribution__c = router.dist.id;
         
        insert members_master;
        
        leads_to_update = router.processed_leads;
		system.debug('these are the leads to update: ' + leads_to_update);
		
        for (lead l : leads_to_update)
        	l.lead_distribution__c = router.dist.id;	
        
        Database.SaveResult[] result = database.update(leads_to_update, false);
        
        for (Database.SaveResult sr : result) {
            if(!sr.isSuccess()) { 
                Database.Error err = sr.getErrors()[0];
                System.Debug(err);
            }       
        }
        
        update router.activeRoundRobinMembers;
    }
    
    public static void disqualifyLeads(set<id> leadids) {
    	
    	id disqualified_queueid = [select queueid from queuesobject where queue.name = 'Disqualified'][0].queueid;
    	lead[] leads = new lead[]{};
    	
    	for (lead l : [select id from lead where id in :leadids]) {
    		l.ownerid = disqualified_queueid;
    		l.status = 'Disqualified';
    		leads.add(l);
    	}
    	
    	update leads;
    } 
    
    public static void assignLeadsByRoundRobin(set<id> leads, boolean distributeLeadsWithPersonalEmails) {
    	
    	//initiate and insert the distro object    	
        LeadDistributionHandler router = new LeadDistributionHandler();
        router.dist.initiated_by__c = userinfo.getuserid();
        router.dist.distribution_date_time__c = system.now();
        insert router.dist;
        
        //this will represent all lead members in this distro
        list<LeadDistributionMember__c> members_master = new list<LeadDistributionMember__c>();
        
        router.leads_to_process = [select id, email, website, company, ownerid from lead where id in :leads and isconverted = false and email != null];  
        
        list<LeadDistributionMember__c> round_robin_leads = router.getRoundRobinLeads(router.leads_to_process, distributeLeadsWithPersonalEmails);
        members_master.addAll(round_robin_leads);
        
        list<lead> leads_to_update = new list<lead>();

        for (LeadDistributionMember__c member : members_master) {
        	member.lead_distribution__c = router.dist.id;
        }
        
        insert members_master;
        
        leads_to_update = router.processed_leads;
        
        Database.SaveResult[] result = database.update(leads_to_update, false);
        
        
        for (Database.SaveResult sr : result) {
            if(!sr.isSuccess()) { 
                Database.Error err = sr.getErrors()[0];
                System.Debug(err);
            }       
        }
        
        update router.activeRoundRobinMembers;
    } 
}