public class LeadDistributionHandler {
    
    public LeadDistribution__c dist;
    public list<lead> leads_to_process = new list<lead>(); 
    public list<lead> processed_leads = new list<lead>();
    public set<id> processed_lead_ids = new set<id>();
    public map<string, list<lead>> email_to_list_of_leads_map = new map<string, list<lead>>();
    public map<string, list<lead>> domain_to_list_of_leads_map = new map<string, list<lead>>();
    
    //public list<LeadQueueMember__c> activeQueueMembers = new list<LeadQueueMember__c>();
    public list<LeadQueueMember__c> activeRoundRobinMembers = new list<LeadQueueMember__c>();
    public set<id> availableUserIds = new set<id>();
    
    private integer round_robin_int = 0;
    
    private set<string> personal_domains = AccountDomains.getPersonalDomains();
    private set<string> corporate_identifiers = AccountDomains.getCorporateIdentifiers();
    
    public LeadDistributionHandler() { 
        this.dist = new LeadDistribution__c();   
        for (LeadQueueMember__c qm : [select id, user__c, isactive__c, round_robin_member__c, (select id from Queue_Member_Vacations__r where start_date__c <= :system.now() and end_date__c >= :system.now()) from leadqueuemember__c where user__c != null and isdeleted = false order by last_round_robin_assignment__c asc]) {      	
        	//if the queue member is not on vacation and they're a round robin member and they're active,
        	//add them to the list of available round robin members for this distro
        	if (qm.Queue_Member_Vacations__r.size() == 0 && qm.round_robin_member__c == true && qm.isactive__c == true) {
	            activeRoundRobinMembers.add(qm);
        	}
            
            availableUserIds.add(qm.user__c);
        }
    }
    
    //returns the id of the next user in line
    private string getNextRoundRobinUserId() {
    	string userid = activeRoundRobinMembers.get(round_robin_int).user__c;
    	activeRoundRobinMembers.get(round_robin_int).last_round_robin_assignment__c = system.now();
    	round_robin_int++;
    	if (round_robin_int == activeRoundRobinMembers.size()) //reset the counter
    		round_robin_int = 0;
    		
    	return userid;
    }
    
	//leads that match an existing account name
    public list<LeadDistributionMember__c> getLeadsMatchedByAccountName(list<lead> leads) {
        list<LeadDistributionMember__c> members = new list<LeadDistributionMember__c>();
        set<string> company_names = new set<string>();
        map<string, list<lead>> company_name_to_lead_map = new map<string, list<lead>>();
        map<string, list<account>> company_name_to_account_map = new map<string, list<account>>();
                
        for (lead l : leads) {
        	if (this.processed_lead_ids.contains(l.id) == true || l.company == null || l.company == '[not provided]')
        		continue;

			string lead_company_name = l.company.tolowercase();
			
			for (string s : this.corporate_identifiers) {
				if (lead_company_name.endsWith(s) == true) {
					lead_company_name = lead_company_name.substring(0, lead_company_name.length() - s.length());
					break;
				}
			}
			
			company_names.add(lead_company_name);
						
			if (!company_name_to_lead_map.containsKey(lead_company_name)) {
				lead[] list_of_leads = new lead[] {l};
				company_name_to_lead_map.put(lead_company_name, list_of_leads);	
			} else { //key exists
				lead[] list_of_leads = company_name_to_lead_map.get(lead_company_name);
				list_of_leads.add(l);
				company_name_to_lead_map.put(lead_company_name, list_of_leads);	
			}					
        }
        
        if (company_name_to_lead_map.size() == 0)
        	return members;
                                   	
    	account[] matching_accounts = [select id, name, ownerid, owner.name, type from account where clean_account_name__c in :company_names];
    	  
  		for (account a : matching_accounts) {
			string account_name = a.name.tolowercase();
			
			for (string s : this.corporate_identifiers) {
				if (account_name.endsWith(s) == true) {
					account_name = account_name.substring(0, account_name.length() - s.length());
					break;
				}
			}
				
			if (!company_name_to_account_map.containsKey(account_name)) {
				account[] list_of_accounts = new account[] {a};
				company_name_to_account_map.put(account_name, list_of_accounts);	
			} else { //key exists
				account[] list_of_accounts = company_name_to_account_map.get(account_name);
				list_of_accounts.add(a);
				company_name_to_account_map.put(account_name, list_of_accounts);	
			}									
		}
		
			
		for (string lead_company_name : company_name_to_lead_map.keyset()) {			
			if (company_name_to_account_map.get(lead_company_name) == null)
				continue;
			
			list<lead> mapped_leads = company_name_to_lead_map.get(lead_company_name);		
        	string new_ownerid = '';
        	boolean isrouted = false;
        	boolean isconflict = false;
        	boolean owner_id_conflict = false;
        	string dist_reason = 'Account Name Match';
        	string matching_account_id = null;
        	string conflict_array = '';
				
			list<account> related_accounts = company_name_to_account_map.get(lead_company_name);
			string first_ownerid = related_accounts.get(0).ownerid;
			
			for (account a : related_accounts) {
				if (a.ownerid != first_ownerid) {
					owner_id_conflict = true;
					break;
				}
			}
			
			if (owner_id_conflict == true) {
				isrouted = false;
				isconflict = true;
				dist_reason = '';
				new_ownerid = '00G4000000105nu'; //conflict queue
			} else {
				isrouted = true;
				isconflict = false;
				new_ownerid = related_accounts.get(0).ownerid;
				matching_account_id = related_accounts.get(0).id;
			}
			
			
        	//ok, process
        	for (lead l : mapped_leads) {
	            
	            LeadDistributionMember__c member = new LeadDistributionMember__c();
	            member.lead__c = l.id;
	            member.routed__c = isrouted;
	            member.conflict__c = isconflict;
	            member.distribution_reason__c = dist_reason;
	            
	            if (!isconflict)
	            	member.assigned_lead_owner__c = new_ownerid; 
	            	               
	            member.matching_account__c = matching_account_id;
	            members.add(member);
	            
	            processed_lead_ids.add(l.id);
	            processed_leads.add(l);
	            
	            if (isconflict == true) {
	            	l.distribution_status__c = 'Account Name Match Conflict';
	            	l.conflict_array__c = conflict_array;
	            } else {
	            	l.distribution_status__c = 'Account Name Match';
	            }
	            
	            l.ownerid = new_ownerid;
        	}
			
	    }
	    
       	return members;

    }
    
	//Review Room leads are simply leads with personal domains
    public list<LeadDistributionMember__c> getReviewRoomLeads(list<lead> leads) {
        list<LeadDistributionMember__c> members = new list<LeadDistributionMember__c>();
        
        for (lead l : leads) {
        	if (this.processed_lead_ids.contains(l.id) == true)
        		continue;

            LeadDistributionMember__c member = new LeadDistributionMember__c();
            member.lead__c = l.id;
            member.routed__c = true;
            member.distribution_reason__c = 'Personal Email';
            members.add(member);
            
            processed_lead_ids.add(l.id);
                       
            l.distribution_status__c = 'Review Room';
            l.ownerid = '00G4000000105na'; //review room queue id
            processed_leads.add(l);
        }
        
        return members;
    }
    
    public list<LeadDistributionMember__c> getRoundRobinLeads(list<lead> leads, boolean distributeLeadsWithPersonalEmails) {
        list<LeadDistributionMember__c> members = new list<LeadDistributionMember__c>();
        
        for (lead l : leads) {
        	if (this.processed_lead_ids.contains(l.id) == true || l.email == null)
        		continue;

        	if (distributeLeadsWithPersonalEmails == false) {
				string email = l.email;
				string emailDomain = email.subString(email.indexOf('@') + 1, email.length()); 
				if (personal_domains.contains(emailDomain))
					continue;
        	}
			
			string roundRobinUserId = this.getNextRoundRobinUserId();
					
            LeadDistributionMember__c member = new LeadDistributionMember__c();
            member.lead__c = l.id;
            member.routed__c = true;
            member.distribution_reason__c = 'Round Robin';
            member.assigned_lead_owner__c = roundRobinUserId;
            members.add(member);
            
            processed_lead_ids.add(l.id);
            
            l.distribution_status__c = 'Round Robin';
            l.ownerid = roundRobinUserId;
            processed_leads.add(l);
        }
        
        return members;
    }
    
    public list<LeadDistributionMember__c> getLeadsMatchedByLeadEmail(list<lead> leads) {
        
        list<LeadDistributionMember__c> members = new list<LeadDistributionMember__c>();
        map<string, lead> email_to_lead_map = new map<string, lead>();
        map<string, list<lead>> email_to_existing_leads_map = new map<string, list<lead>>();
                
        lead[] existing_leads = [select id, email, ownerid, owner.name from lead where email in :this.email_to_list_of_leads_map.keyset() and id not in :leads and id not in :processed_lead_ids and ownerid in :availableUserIds and isconverted = false];
        
        for (lead l : existing_leads) {
        	list<lead> mapped_leads = new list<lead>();
            if (!email_to_existing_leads_map.containsKey(l.email)) {
            	mapped_leads.add(l);
                email_to_existing_leads_map.put(l.email, mapped_leads);
            } else { //key exists, add the current lead to the mapped list
            	list<lead> currently_mapped_leads = email_to_existing_leads_map.get(l.email);
            	currently_mapped_leads.add(l);
            	email_to_existing_leads_map.put(l.email, currently_mapped_leads);
            }   
        }
                
        for (lead l : leads) {      	
        	if (this.processed_lead_ids.contains(l.id) == true)
        		continue;
        		
        	string new_ownerid = '';
        	boolean isrouted = false;
        	boolean isconflict = false;
        	string dist_reason = 'Lead Email Match';
        	string matching_lead_id = null;
        	string conflict_array = '';
        	
			if (email_to_existing_leads_map.get(l.email) != null) {
				
            	if (email_to_existing_leads_map.get(l.email).size() > 1) { //if the lead matched more than one contact
					
					list<lead> mapped_leads = email_to_existing_leads_map.get(l.email);
					string first_ownerid = mapped_leads.get(0).ownerid;
					boolean owner_id_conflict = false;
					for (lead existing_lead : mapped_leads) {
						if (existing_lead.ownerid != first_ownerid) { //conflict!
							owner_id_conflict = true;
							break;
						}
					}
					
					if (owner_id_conflict == true) {
						//set<id> matching_ids = new set<id>();
						for (lead existing_lead : mapped_leads) {
							conflict_array += existing_lead.ownerid + '/' + existing_lead.owner.name + ' (Lead Owner):' + existing_lead.id + ';';
							//matching_ids.add(existing_lead.ownerid);
						}
					}
					
					if (owner_id_conflict == true) {
						isrouted = false;
						isconflict = true;
						dist_reason = '';
						new_ownerid = '00G4000000105nu'; //conflict queue
					} else {
						isrouted = true;
						isconflict = false;
						new_ownerid = mapped_leads.get(0).ownerid;
						matching_lead_id = mapped_leads.get(0).id;
					}   
					         		
            	} else if (email_to_existing_leads_map.get(l.email).size() == 1) { //matched one contact, so assign to the owner
        			lead existing_lead = email_to_existing_leads_map.get(l.email).get(0);
        			new_ownerid = existing_lead.ownerid;
        			isrouted = true;
        			matching_lead_id = existing_lead.id;
            	}
            	
            	//ok, process
        		lead existing_lead = email_to_existing_leads_map.get(l.email).get(0);
                LeadDistributionMember__c member = new LeadDistributionMember__c();
                member.lead__c = l.id;
                member.routed__c = isrouted;
                member.conflict__c = isconflict;
                member.distribution_reason__c = dist_reason;
                if (!isconflict)
                	member.assigned_lead_owner__c = new_ownerid;                
                member.matching_lead__c = matching_lead_id;
                members.add(member);
                
                processed_lead_ids.add(l.id);
                
                if (isconflict == true) {
                	l.distribution_status__c = 'Lead Owner Conflict';
                	l.conflict_array__c = conflict_array;
                } else {
                	l.distribution_status__c = 'Lead Email Match';
                }
                l.ownerid = new_ownerid;
                processed_leads.add(l);
            }
        }
        
        return members;
    }
    
    public list<LeadDistributionMember__c> getLeadsMatchedByLeadDomain(list<lead> leads) {
        
        list<LeadDistributionMember__c> members = new list<LeadDistributionMember__c>();
        
        map<string, lead> email_to_lead_map = new map<string, lead>();
        map<string, list<lead>> domain_to_existing_leads_map = new map<string, list<lead>>();
                
        lead[] existing_leads = [select id, email, ownerid, owner.name, domain__c from lead where domain__c in :this.domain_to_list_of_leads_map.keyset() and id not in :leads and isconverted = false and id not in :processed_lead_ids and ownerid in :availableUserIds];
        
        for (lead l : existing_leads) {
        	list<lead> mapped_leads = new list<lead>();
            if (!domain_to_existing_leads_map.containsKey(l.domain__c)) {
            	mapped_leads.add(l);
                domain_to_existing_leads_map.put(l.domain__c, mapped_leads);
            } else { //key exists, add the current lead to the mapped list
            	list<lead> currently_mapped_leads = domain_to_existing_leads_map.get(l.domain__c);
            	currently_mapped_leads.add(l);
            	domain_to_existing_leads_map.put(l.domain__c, currently_mapped_leads);
            }   
        }


        for (lead l : leads) {      	
        	if (this.processed_lead_ids.contains(l.id) == true || l.domain__c == null)
        		continue;	
        		
        	if (this.personal_domains.contains(l.domain__c))
					continue;	
    		      		
        	string new_ownerid = '';
        	boolean isrouted = false;
        	boolean isconflict = false;
        	string dist_reason = 'Lead Domain Match';
        	string matching_lead_id = null;
        	string conflict_array = '';
        	
			if (domain_to_existing_leads_map.get(l.domain__c) != null) {
				
            	if (domain_to_existing_leads_map.get(l.domain__c).size() > 1) { //if the lead matched more than one contact
					
					list<lead> mapped_leads = domain_to_existing_leads_map.get(l.domain__c);
					string first_ownerid = mapped_leads.get(0).ownerid;
					boolean owner_id_conflict = false;
					for (lead existing_lead : mapped_leads) {
						if (existing_lead.ownerid != first_ownerid) { //conflict!
							owner_id_conflict = true;
							break;
						}
					}
					
					if (owner_id_conflict == true) {
						//set<id> matching_ids = new set<id>();
						for (lead existing_lead : mapped_leads) {
							conflict_array += existing_lead.ownerid + '/' + existing_lead.owner.name + ' (Lead Owner):' + existing_lead.id + ';';
							//matching_ids.add(existing_lead.ownerid);
						}
					}
					
					if (owner_id_conflict == true) {
						isrouted = false;
						isconflict = true;
						dist_reason = '';
						new_ownerid = '00G4000000105nu'; //conflict queue
					} else {
						isrouted = true;
						isconflict = false;
						new_ownerid = mapped_leads.get(0).ownerid;
						matching_lead_id = mapped_leads.get(0).id;
					}   
					         		
            	} else if (domain_to_existing_leads_map.get(l.domain__c).size() == 1) { //matched one contact, so assign to the owner
        			lead existing_lead = domain_to_existing_leads_map.get(l.domain__c).get(0);
        			new_ownerid = existing_lead.ownerid;
        			isrouted = true;
        			matching_lead_id = existing_lead.id;
            	}
            	
            	//ok, process
        		lead existing_lead = domain_to_existing_leads_map.get(l.domain__c).get(0);
                LeadDistributionMember__c member = new LeadDistributionMember__c();
                member.lead__c = l.id;
                member.routed__c = isrouted;
                member.conflict__c = isconflict;
                member.distribution_reason__c = dist_reason;
                if (!isconflict)
                	member.assigned_lead_owner__c = new_ownerid;                
                member.matching_lead__c = matching_lead_id;
                members.add(member);
                
                processed_lead_ids.add(l.id);
                
                if (isconflict == true) {
                	l.distribution_status__c = 'Lead Owner Conflict';
                	l.conflict_array__c = conflict_array;
                } else {
                	l.distribution_status__c = 'Lead Domain Match';
                }
                l.ownerid = new_ownerid;
                processed_leads.add(l);
            }
        }

        return members;
    }
    
    
    public list<LeadDistributionMember__c> getLeadsMatchedByContactEmail(list<lead> leads) {
        list<LeadDistributionMember__c> members = new list<LeadDistributionMember__c>();
        map<string, lead> email_to_lead_map = new map<string, lead>();
        map<string, list<contact>> email_to_contact_map = new map<string, list<contact>>();
                
        contact[] contacts = [select id, email, ownerid, owner.name, accountid, account.ownerid, account.type from contact where email in :this.email_to_list_of_leads_map.keyset() and account.ownerid in :availableUserIds];
        
        system.debug('returned matching contacts: ' + contacts);
        
        for (contact c : contacts) {
        	list<contact> mapped_contacts = new list<contact>();
            if (!email_to_contact_map.containsKey(c.email)) {
            	mapped_contacts.add(c);
                email_to_contact_map.put(c.email, mapped_contacts);
            } else { //key exists, add the current contact to the mapped list
            	list<contact> currently_mapped_contacts = email_to_contact_map.get(c.email);
            	currently_mapped_contacts.add(c);
            	email_to_contact_map.put(c.email, currently_mapped_contacts);
            }   
        }
        
        system.debug('email to contact map: ' + email_to_contact_map);
        
        for (lead l : leads) {
        	if (this.processed_lead_ids.contains(l.id) == true)
        		continue;
        	  			
        	string new_ownerid = '';
        	boolean isrouted = false;
        	boolean isconflict = false;
        	string dist_reason = 'Contact Email Match';
        	string matching_contact_id = null;
        	string conflict_array = '';
        	
        	//if it's found in the map, process it
            if (email_to_contact_map.get(l.email) != null) {
            	
            	if (email_to_contact_map.get(l.email).size() > 1) { //if the lead matched more than one contact
            		
					list<contact> mapped_contacts = email_to_contact_map.get(l.email);
					string first_ownerid = mapped_contacts.get(0).ownerid;
					boolean owner_id_conflict = false;
					for (contact c : mapped_contacts) {
						if (c.ownerid != first_ownerid) { //conflict!
							owner_id_conflict = true;
							break;
						}
					}
					
					if (owner_id_conflict == true) {
						for (contact existing_contact : mapped_contacts) {
							conflict_array += existing_contact.ownerid + '/' + existing_contact.owner.name + ' (Contact Owner):' + existing_contact.id + ';';
						}
					}
					
					if (owner_id_conflict == true) {
						isrouted = false;
						isconflict = true;
						dist_reason = '';
						new_ownerid = '00G4000000105nu'; //conflict queue
					} else {
						isrouted = true;
						isconflict = false;
						new_ownerid = mapped_contacts.get(0).ownerid;
						matching_contact_id = mapped_contacts.get(0).id;
					}
										
            	} else if (email_to_contact_map.get(l.email).size() == 1) { //matched one contact, so assign to the owner
        			contact c = email_to_contact_map.get(l.email).get(0);
        			new_ownerid = c.ownerid;
        			isrouted = true;
        			matching_contact_id = c.id;
            	}
            	
            	//ok, process
        		contact c = email_to_contact_map.get(l.email).get(0);
                LeadDistributionMember__c member = new LeadDistributionMember__c();
                member.lead__c = l.id;
                member.routed__c = isrouted;
                member.conflict__c = isconflict;
                member.distribution_reason__c = dist_reason;
                if (!isconflict)
                	member.assigned_lead_owner__c = new_ownerid;                
                member.matching_contact__c = matching_contact_id;
                members.add(member);
                
                processed_lead_ids.add(l.id);
                
                string leadtype = 'Current prospect, Current contact';       
                if (c.account.type == 'Customer')
                	leadtype = 'Customer';
                
                l.lead_type__c = leadtype;
                if (isconflict == true) {
                	l.distribution_status__c = 'Contact Owner Conflict';
                	l.conflict_array__c = conflict_array;
                } else {
                	l.distribution_status__c = 'Contact Email Match';
                }
                l.ownerid = new_ownerid;
                processed_leads.add(l);
            }
        }
        
        system.debug('contact match members: ' + members);
        return members;
    }
    
    public list<LeadDistributionMember__c> getLeadsMatchedByAccountDomains(list<lead> leads) {
        system.debug('foooooo');
        list<LeadDistributionMember__c> members = new list<LeadDistributionMember__c>();
		list<Lead> leads_to_match = new list<Lead>();
		list<Lead> leadsToUpdate = new list<Lead>();
		set<string> lead_domains = new set<String>();
		set<string> lead_companies = new set<string>();
		set<string> personal_domains = AccountDomains.getPersonalDomains(); //gather list of personal domains (which will be ignored)
		set<string> corporate_identifiers = AccountDomains.getCorporateIdentifiers();	
		
		for (lead l : leads) {
        	if (this.processed_lead_ids.contains(l.id) == true)
        		continue;

			if (l.email != null) {
				String lead_email_domain = '';
				String lead_email = l.email;
				
				//johndoe@google.com's domain is 'google.com'
				lead_email_domain = lead_email.subString(lead_email.indexOf('@') + 1, lead_email.length()); 
        		
        		system.debug('lead email domain: ' + lead_email_domain);
				
				//if the lead's email domain is not a personal domain and it's a valid email address, add it to the leads to be processed
				if (personal_domains.contains(lead_email_domain) == false && lead_email.contains('@') == true) { 
					lead_domains.add(lead_email_domain);
					leads_to_match.add(l);
				} else if (personal_domains.contains(lead_email_domain) == true && l.company != null) { 
					//if the lead's email IS a personal one, try to run an exact account match
					string lead_company = l.company;
					for (string s : corporate_identifiers) {
						if (lead_company.contains(s)) {
							lead_company.replace(s, '');
						}
					}
					lead_companies.add(lead_company);
				}
			}
		}
		
        system.debug('lead domains: ' + lead_domains);
		
		set<id> account_ids = new set<id>();
		//gather the list of contacts whose domain__c is in the list of domains
		try{
			for (Contact c : [select id, accountid from contact where 
				email != null AND 
				domain__c != null AND 
				isdeleted = false AND 
				domain__c in :lead_domains 
				and domain__c not in :personal_domains ]) {
				account_ids.add(c.accountid);	
			}
		}
		catch(Exception e){System.debug(e);}
		
		system.debug('matching accountids: ' + account_ids);
		
		//now gather the list of accounts of the contacts collected above (and accounts whose domain__c field matches)
		List<Account> domain_matched_accounts = [select id, name, ownerid, owner.name, domain__c, domainlist__c from account where 
			(domain__c in :lead_domains OR id in :account_ids) AND 
			domainlist__c != ';' AND 
			domainlist__c != null AND 
			isdeleted = false AND
			ownerid in :availableUserIds AND
			owner.isactive = true];
			
		//list<account> company_matched_accounts = [select id, name, ownerid, owner.name from account where name in :] 
        map<string, list<account>> domain_to_account_map = new map<string, list<account>>();
		
		system.debug('matching accounts: ' + domain_matched_accounts);
		//our goal here is to create a map of domain to account where we have a list of unique domains and the owner
		for (Account a : domain_matched_accounts) {			
			string account_domain_list = a.domainlist__c;
			set<string> accountDomains = new set<string>();
			list<string> list_of_account_domains = new list<string>();
			

			
			if (account_domain_list.startsWith(';'))
				account_domain_list.replaceFirst(';', '');
				
			String[] account_domain_array = account_domain_list.split(';');
			
			//loop through the account's list of domains (includes the account's website domain AND the list of contact domains
			for (integer j = 0; j < account_domain_array.size(); j++) { 
				if (accountDomains.contains(account_domain_array[j]) == false)  //ensure this is a unique list of domains
					list_of_account_domains.add(account_domain_array[j]); //create an array of domains related to this account
				
				accountDomains.add(account_domain_array[j]);
				
			}
			
			//loop the account's list of domains
			for (integer i = 0; i < list_of_account_domains.size(); i++) { 
				if (domain_to_account_map.containsKey(list_of_account_domains[i])) {
					//an account with this domain is already in the map, add the account to the list of accounts
					list<account> mapped_accounts = domain_to_account_map.get(list_of_account_domains[i]);
					mapped_accounts.add(a);
					domain_to_account_map.put(list_of_account_domains[i], mapped_accounts);
				} else { //this is a unique domain, put it in the map
					if (list_of_account_domains[i] != null && list_of_account_domains[i].length() > 0) {
						list<account> accounts = new list<account>();
						accounts.add(a);
						domain_to_account_map.put(list_of_account_domains[i], accounts);
					}
				}
			}
			
			system.debug('mapped accounts: ' + domain_to_account_map);
		}


		if (domain_to_account_map.size() > 0) {						
	        
	        for (lead l : leads_to_match) {	
        	if (this.processed_lead_ids.contains(l.id) == true)
        		continue;

				String lead_email_domain = '';
				String lead_email = l.email;
				lead_email_domain = lead_email.subString(lead_email.indexOf('@') + 1, lead_email.length()); 
	        	
	        	string new_ownerid = '';
	        	boolean isrouted = false;
	        	boolean isconflict = false;
	        	string dist_reason = 'Account Domain Match';
	        	string matching_account_id = null;
	        	string conflict_array = '';
	        	
	            if (domain_to_account_map.get(lead_email_domain) != null) {
	            	
	            	if (domain_to_account_map.get(lead_email_domain).size() > 1) { //if the lead matched more than one account
	            		system.debug('map is ok!!!');
						list<account> mapped_accounts = domain_to_account_map.get(lead_email_domain);
						string first_ownerid = mapped_accounts.get(0).ownerid;
						boolean owner_id_conflict = false;
						for (account a : mapped_accounts) {
							if (a.ownerid != first_ownerid) { //conflict!
								owner_id_conflict = true;
								break;
							}
						}
						
						if (owner_id_conflict == true) {
							for (account existing_account : mapped_accounts) {
								conflict_array += existing_account.ownerid + '/' + existing_account.owner.name + ' (Account Owner):' + existing_account.id + ';';
							}
						}
						
						if (owner_id_conflict == true) {
							isrouted = false;
							isconflict = true;
							dist_reason = '';
							new_ownerid = '00G4000000105nu'; //conflict queue
						} else {
							isrouted = true;
							isconflict = false;
							new_ownerid = mapped_accounts.get(0).ownerid;
							matching_account_id = mapped_accounts.get(0).id;
						}
											
	            	} else if (domain_to_account_map.get(lead_email_domain).size() == 1) { //matched one account, so assign to the owner
	        			account a = domain_to_account_map.get(lead_email_domain).get(0);
	        			new_ownerid = a.ownerid;
	        			isrouted = true;
	        			matching_account_id = a.id;
	            	}
	            	
	            	//ok, process
	        		account a = domain_to_account_map.get(lead_email_domain).get(0);
	                LeadDistributionMember__c member = new LeadDistributionMember__c();
	                member.lead__c = l.id;
	                member.routed__c = isrouted;
	                member.conflict__c = isconflict;
	                member.distribution_reason__c = dist_reason;
	                if (!isconflict)
	                	member.assigned_lead_owner__c = new_ownerid;                
	                member.matching_account__c = matching_account_id;
	                members.add(member);
	                
	                processed_lead_ids.add(l.id);
	                
	                if (isconflict == true) {
	                	l.distribution_status__c = 'Account Owner Conflict';
	                	l.conflict_array__c = conflict_array;
	                } else {
	                	l.distribution_status__c = 'Account Domain Match';
	                }
	                l.ownerid = new_ownerid;
	                processed_leads.add(l);
	            }
	        }
		}
		
		return members;
	}
}