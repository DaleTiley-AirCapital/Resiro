using System.Net;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using RezDNA.API.Services;

var checks=0;
void Check(string name,bool value){if(!value)throw new Exception("FAIL "+name);checks++;Console.WriteLine("PASS "+name);}
var source=new AnalysisDocument("doc-1","policy.txt","First page.\fThe roof must be inspected every twelve months.","sha");
JsonObject Draft()=>new(){["summary"]="Annual roof inspection is mentioned.",["findings"]=new JsonArray(new JsonObject{
    ["title"]="Roof inspection",["category"]="maintenance",["document_id"]="doc-1",
    ["quote"]="The roof must be inspected every twelve months.",["explanation"]="The document includes this inspection requirement.",
    ["suggested_action"]="Review the inspection requirement and choose a reminder date."}),["limitations"]=new JsonArray("Not an insurer's decision.")};
void Reject(string name,Action action){try{action();throw new Exception("Expected rejection: "+name);}catch(AnalysisFailure){Check(name,true);}}
Check("grounded quote gets host page",AiAnalysisService.Validate(Draft(),new[]{source})["findings"]![0]!["page"]!.GetValue<int>()==2);
var fabricated=Draft();fabricated["findings"]![0]!["quote"]="This sentence is absent from the source.";
Reject("fabricated excerpt rejected",()=>AiAnalysisService.Validate(fabricated,new[]{source}));
var unknown=Draft();unknown["findings"]![0]!["document_id"]="other-tenant";
Reject("unknown document rejected",()=>AiAnalysisService.Validate(unknown,new[]{source}));
var shortQuote=Draft();shortQuote["findings"]![0]!["quote"]="roof";
Reject("insufficient excerpt rejected",()=>AiAnalysisService.Validate(shortQuote,new[]{source}));
var category=Draft();category["findings"]![0]!["category"]="approved";
Reject("invented category rejected",()=>AiAnalysisService.Validate(category,new[]{source}));
var empty=Draft();empty["findings"]=new JsonArray();Check("empty observation list allowed",AiAnalysisService.Validate(empty,new[]{source})["findings"]!.AsArray().Count==0);
Check("naive local time rejected",!WorkflowState.Time(new JsonObject{["when"]="2030-01-01T10:00"},"when",out _));
Check("Johannesburg offset converted to UTC",WorkflowState.Time(new JsonObject{["when"]="2030-01-01T10:00:00+02:00"},"when",out var utc)&&utc.Hour==8&&utc.Kind==DateTimeKind.Utc);
var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"OPENAI_API_KEY","unit-test-placeholder"}}).Build();
var handler=new FakeHandler(Draft());var service=new AiAnalysisService(new HttpClient(handler),config);
var success=await service.Analyze(new[]{source},CancellationToken.None);
Check("Responses adapter parses valid output",success.responseId=="resp-test"&&success.result["findings"]!.AsArray().Count==1);
Check("Responses request uses schema and store false",handler.ValidRequest);
handler.Status=HttpStatusCode.TooManyRequests;
try{await service.Analyze(new[]{source},CancellationToken.None);throw new Exception("Expected provider rejection");}
catch(AnalysisFailure ex){Check("provider rate limit is not success",ex.Code=="provider_limit");}
handler.Status=HttpStatusCode.OK;handler.Completed=false;
try{await service.Analyze(new[]{source},CancellationToken.None);throw new Exception("Expected incomplete rejection");}
catch(AnalysisFailure ex){Check("incomplete response is not success",ex.Code=="incomplete");}
var unconfigured=new AiAnalysisService(new HttpClient(handler),new ConfigurationBuilder().Build());
try{await unconfigured.Analyze(new[]{source},CancellationToken.None);throw new Exception("Expected configuration rejection");}
catch(AnalysisFailure ex){Check("missing credential fails closed",ex.Code=="not_configured");}
Console.WriteLine("COMPLETE "+checks+" isolated analysis and timezone checks");

sealed class FakeHandler : HttpMessageHandler {
    private readonly JsonObject result;
    public bool ValidRequest{get;private set;}
    public HttpStatusCode Status{get;set;}=HttpStatusCode.OK;
    public bool Completed{get;set;}=true;
    public FakeHandler(JsonObject result){this.result=result;}
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken stop){
        var body=JsonNode.Parse(await request.Content!.ReadAsStringAsync(stop))!;
        ValidRequest=request.RequestUri!.AbsoluteUri=="https://api.openai.com/v1/responses"&&
            body["store"]!.GetValue<bool>()==false&&body["text"]!["format"]!["strict"]!.GetValue<bool>()&&
            body["instructions"]!.ToString().Contains("untrusted");
        var response=new JsonObject{["id"]="resp-test",["status"]=Completed?"completed":"incomplete",
            ["output"]=new JsonArray(new JsonObject{["type"]="message",["content"]=new JsonArray(new JsonObject{
                ["type"]="output_text",["text"]=result.ToJsonString()})})};
        return new HttpResponseMessage(Status){Content=new StringContent(response.ToJsonString())};
    }
}
