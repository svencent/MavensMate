/**
 * This class contains unit tests for validating the behavior of Apex classes
 * and triggers.
 *
 * Unit tests are class methods that verify whether a particular piece
 * of code is working properly. Unit test methods take no arguments,
 * commit no data to the database, and are flagged with the testMethod
 * keyword in the method definition.
 *
 * All test methods in an organization are executed whenever Apex code is deployed
 * to a production organization to confirm correctness, ensure code
 * coverage, and prevent regressions. All Apex classes are
 * required to have at least 75% code coverage in order to be deployed
 * to a production organization. In addition, all triggers must have some code coverage.
 * 
 * The @isTest class annotation indicates this class only contains test
 * methods. Classes defined with the @isTest annotation do not count against
 * the organization size limit for all Apex scripts.
 *
 * See the Apex Language Reference for more information about Testing and Code Coverage.
 */
@isTest
private class Test_AccountPhotoExtension {
	
	static testMethod void uploadPhoto() {
        Account a = new Account();
        a.Name = 'A Test Account';
        insert a;
        
		Test.setCurrentPage(Page.addAccountPhoto);
		AccountPhotoExtension c = new AccountPhotoExtension(new ApexPages.Standardcontroller(a));
		c.init();
		System.assertEquals(null, c.photo);
		
		String base64Body = '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';
		Blob b = Blob.valueOf(base64Body);
		c.newPhoto.Body = b;
    	c.doUpload();
    	System.assertEquals(1, [Select count() From Attachment Where ParentId = :a.Id And Name = 'photo']);
    }
    
}