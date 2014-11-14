public class SyncProduct {
    public class product {
        public String country_id;
        public String category_id;
        public String product_type_id;
        public String product_name;
        public String product_id;
        public String sf_product_id;
        public String status;
        public String price;
        public String access;
        public String subscription_length;
        public String description;
        private String[] country_id_type_info = new String[]{'country_id','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] category_id_type_info = new String[]{'category_id','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] product_type_id_type_info = new String[]{'product_type_id','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] product_name_type_info = new String[]{'product_name','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] product_id_type_info = new String[]{'product_id','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] sf_product_id_type_info = new String[]{'sf_product_id','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] status_type_info = new String[]{'status','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] price_type_info = new String[]{'price','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] access_type_info = new String[]{'access','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] subscription_length_type_info = new String[]{'subscription_length','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] description_type_info = new String[]{'description','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] apex_schema_type_info = new String[]{'https://services.haygrouppaynet.com','false','false'};
        private String[] field_order_type_info = new String[]{'country_id','category_id','product_type_id','product_name','product_id','sf_product_id','status','price','access','subscription_length','description'};
    }
    public class syncProductResponse {
        public SyncProduct.syncProductResponseDetails_element syncProductResponseDetails;
        private String[] syncProductResponseDetails_type_info = new String[]{'syncProductResponseDetails','https://services.haygrouppaynet.com','syncProductResponseDetails_element','1','1','false'};
        private String[] apex_schema_type_info = new String[]{'https://services.haygrouppaynet.com','false','false'};
        private String[] field_order_type_info = new String[]{'syncProductResponseDetails'};
    }
    public class syncProductResponseDetails_element {
        public String resultFlag;
        private String[] resultFlag_type_info = new String[]{'resultFlag','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] apex_schema_type_info = new String[]{'https://services.haygrouppaynet.com','false','false'};
        private String[] field_order_type_info = new String[]{'resultFlag'};
    }
    public class HGRISSalesForceIntegration_products_svcPort0 {
        public String endpoint_x = 'https://test.services.haygrouppaynet.com/soap/custom';
        public Map<String,String> inputHttpHeaders_x;
        public Map<String,String> outputHttpHeaders_x;
        public String clientCert_x;
        public String clientCertPasswd_x;
        public Integer timeout_x;
        private String[] ns_map_type_info = new String[]{'https://services.haygrouppaynet.com', 'SyncProduct'};
        public SyncProduct.syncProductResponseDetails_element syncProduct(SyncProduct.auth auth,String action,SyncProduct.product product) {
            SyncProduct.syncProductRequest request_x = new SyncProduct.syncProductRequest();
            SyncProduct.syncProductResponse response_x;
            request_x.auth = auth;
            request_x.action = action;
            request_x.product = product;
            Map<String, SyncProduct.syncProductResponse> response_map_x = new Map<String, SyncProduct.syncProductResponse>();
            response_map_x.put('response_x', response_x);
            WebServiceCallout.invoke(
              this,
              request_x,
              response_map_x,
              new String[]{endpoint_x,
              '',
              'https://services.haygrouppaynet.com',
              'syncProduct',
              'https://services.haygrouppaynet.com',
              'syncProductResponse',
              'SyncProduct.syncProductResponse'}
            );
            response_x = response_map_x.get('response_x');
            return response_x.syncProductResponseDetails;
            //return response_x;
        }
    }
    public class syncProductRequest {
        public SyncProduct.auth auth;
        public String action;
        public SyncProduct.product product;
        private String[] auth_type_info = new String[]{'auth','https://services.haygrouppaynet.com','auth','1','1','false'};
        private String[] action_type_info = new String[]{'action','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] product_type_info = new String[]{'product','https://services.haygrouppaynet.com','product','1','1','false'};
        private String[] apex_schema_type_info = new String[]{'https://services.haygrouppaynet.com','false','false'};
        private String[] field_order_type_info = new String[]{'auth','action','product'};
    }
    public class syncProductRequestType {
        public SyncProduct.syncProductRequest syncProduct;
        private String[] syncProduct_type_info = new String[]{'syncProduct','https://services.haygrouppaynet.com','syncProductRequest','1','1','false'};
        private String[] apex_schema_type_info = new String[]{'https://services.haygrouppaynet.com','false','false'};
        private String[] field_order_type_info = new String[]{'syncProduct'};
    }
    public class auth {
        public String username;
        public String password;
        private String[] username_type_info = new String[]{'username','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] password_type_info = new String[]{'password','http://www.w3.org/2001/XMLSchema','string','1','1','false'};
        private String[] apex_schema_type_info = new String[]{'https://services.haygrouppaynet.com','false','false'};
        private String[] field_order_type_info = new String[]{'username','password'};
    }
    public class syncProductResponseType {
        public SyncProduct.syncProductResponse syncProductResponse;
        private String[] syncProductResponse_type_info = new String[]{'syncProductResponse','https://services.haygrouppaynet.com','syncProductResponse','1','1','false'};
        private String[] apex_schema_type_info = new String[]{'https://services.haygrouppaynet.com','false','false'};
        private String[] field_order_type_info = new String[]{'syncProductResponse'};
    }
}