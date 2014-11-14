global class PostResponse {
	global Boolean hasMore { get; set; }
   	global Integer pageNumber { get; set; }
    global List<SObject> posts { get; set; }
    global PostResponse(List<SObject> posts) {
    	this.posts = posts;
    }
}