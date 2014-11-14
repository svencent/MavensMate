public class ConvertAccountLeads_Controller {
	public final Account a;
	lead[] leads;
	
	public cLead[] leadList {get; set;}
	public string checkbox_state {get;set;}
	public boolean all_checkbox_selected {get;set;}
	
	public ConvertAccountLeads_Controller(ApexPages.StandardController stdController) {
        this.a = (Account)stdController.getRecord();
        this.checkbox_state = 'None';
        this.all_checkbox_selected = false;
    }
    
	public class cLead {
        public Lead lead {get; set;}
        public Boolean selected {get; set;}
        
        public cLead(Lead l) {
            this.lead = l;
            this.selected = false;
        }
    }
	
	public List<cLead> getMatchingLeads() {
		if (leadList != null && leadList.size() > 0){
			system.debug(leadList);
			return leadList;	
		} else {
			leadList = new List<cLead>();
			string cleanName = a.Name;
			cleanName = cleanName.replace('Inc.', '');
			cleanName = cleanName.replace('Co.', '');
			
			this.leads = [select id, createdby.name, createddate, firstname, title, lastname, email, company, website from lead where company like :'%'+cleanName+'%' and isconverted = false limit 200];
			
			if (this.leads.size() > 0) {
				for (Lead l : leads) {
		        	leadList.add(new cLead(l));
				}
	        	return leadList;
			} else {
				return null;	
			}
		}
	}
	
	public PageReference selectAll() {
		for (cLead myLead : leadList)
			myLead.selected = true;	

		this.checkbox_state = 'All';
        this.all_checkbox_selected = true;
		return null;
	}
	
	public PageReference selectNone() {
		for (cLead myLead : leadList)
			myLead.selected = false;	
		
		this.checkbox_state = 'None';
        this.all_checkbox_selected = false;
		return null;
	}
    
    public PageReference processSelected() {
        List<Lead> selectedLeads = new List<Lead>();
        
        for(cLead myLead : leadList) {
            if(myLead.selected == true)
                selectedLeads.add(myLead.lead);
        }
        
        System.debug('These are the selected leads...');
		LeadStatus convertstatus = [select Id, MasterLabel from LeadStatus where IsConverted=true limit 1];
        
        for(Lead l : selectedLeads) {
            system.debug(l);
			Database.LeadConvert lc = new database.LeadConvert();
			lc.setLeadId(l.Id);
			lc.setAccountId(a.Id);
			lc.setDoNotCreateOpportunity(true);
			lc.setConvertedStatus(convertStatus.MasterLabel);
			Database.LeadConvert[] lcArray = new Database.LeadConvert[] {lc};
			Database.LeadConvertResult[] results = Database.convertLead(lcArray);
			System.assert(results[0].IsSuccess());
        }
        
    	PageReference referringPage = new PageReference('/' + a.id);
		referringPage.setRedirect(true);
		return referringPage;
    }
    
    public PageReference cancel() {
    	PageReference referringPage = new PageReference('/' + a.id);
		referringPage.setRedirect(true);
		system.debug('redirect!!!: ' + referringPage);
		return referringPage;
    }
}