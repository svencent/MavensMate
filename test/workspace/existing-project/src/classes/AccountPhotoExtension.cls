public with sharing class AccountPhotoExtension {
	
	private final ApexPages.standardController controller;  
	public Account a { get; set; }
	public Attachment photo { get; set; }
	public Attachment newPhoto { get; set; }
	
	public AccountPhotoExtension(ApexPages.StandardController stdController) {
		this.controller = stdController;
		this.a = (Account) stdController.getRecord();
	}
	
	public void init() {
		try {
    		this.photo = [select id from Attachment where parentid = :this.a.id and name = 'photo' limit 1];
    	} catch(exception e) { }
    	
    	this.newPhoto = new Attachment();
	}
	
	public PageReference doUpload() {
		try {
			if (this.newPhoto.body != null) {
				if (this.photo != null)
					delete this.photo;
				this.newPhoto.parentid = this.a.id;
				this.newPhoto.name = 'photo';
				insert this.newPhoto;
				
				a.Image_Id__c = this.newPhoto.Id;
				update a;
			}
		} catch (DmlException e) {
			for (Integer i = 0; i < e.getNumDml(); i++) {
				ApexPages.Message error = new ApexPages.Message(ApexPages.Severity.ERROR, 'An error has occurred ('+e.getDmlMessage(i)+').  Please contact your administrator');
				ApexPages.addMessage(error);
		    } 
		    return null;
		}
		
		return this.controller.view();
	}
}