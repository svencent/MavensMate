@isTest
private class MyTest {

	@isTest static void test_method_one() {
		// Implement test code
		Account a = new Account();
		a.name = 'OK';
		insert a;
		System.assert(true == false);
	}

	@isTest static void test_method_two() {
		// Implement test code
	}

}