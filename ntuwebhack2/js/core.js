// JavaScript Document
 FB.init({
      appId      : '135188399980815', // App ID from the App Dashboard
      status     : true, // check the login status upon init?
      cookie     : true, // set sessions cookies to allow your server to access the session?
      xfbml      : true  // parse XFBML tags on this page?
    });
	
var g_param = { user: null, group:null };
$(document).ready(function(){
    $("#login").bind("click",function(){
        FB.login(function(response) {
           if (response.authResponse) {
			  g_param["user"] = new User();
           } else {
             $("#login").show();
			 $(".status,#logout").hide();
           }
         },{scope: "user_groups, friends_groups"});
    });
	FB.getLoginStatus(function(response) {
        if (response.authResponse) {
			 g_param["user"] = new User();
        } else {
             $("#login").show();
			 $(".status,#logout").hide();
			 
        }
    });
	$("#logout").click(function(e){
		FB.logout(function(){
			$("#login").show();
			$(".status,#logout").hide();
			$("#groupset li.groupitem").remove();
			$("#groupset .nav-header .name, #groupset .nav-header .count").html("");
			$("#userlist").html("");
			$(".progress-bar span").css("width","0%");
			$(".progress-bar label").html("0%");
		})
		e.preventDefault();
	});
	$('#myModal').modal({show:false});
});
var User = function(){
	var name = null;
	var uid = null;
	var friends = [];
	$("#statusMsg").show().html("使用者認證中");
	$("#logout").show();
	$("#login").hide();
	FB.api("/me?fields=id,name,friends",function(response){
		$(".status a").html(response["name"]);
		$(".status").show();
		uid = response["id"];
		friends = $.map(response["friends"]["data"],function(elem){
			return elem["id"];
		});
		GetGroup({"name": response["name"], "uid":response["id"] });
		$("#statusMsg").show().html("登入成功!");
		_gaq.push(['_trackEvent', 'login', response["id"] +"" ]);
	});
	PageSetting();
	this.getFriend = function(){
		return friends;	
	};
	this.getUID = function(){
		return uid;	
	};
};
var PageSetting = function(){
	$("#groupset li.groupitem").click(function(e){
		e.preventDefault();
	})
}

var GetGroup = function(user){
	
	$("#groupset .nav-header .name").html(user["name"]);
	clearTimeout($("#statusMsg").data("domqueue"));
	$("#statusMsg").show().html("讀取社團清單...");
	$("#statusMsg").data("domqueue", setTimeout(function(){ $("#statusMsg").slideUp("fast"); }, 3000));
	FB.api( user["uid"]+'/groups?fields=id,name,icon',function(response){
		data = response["data"];
		g_param["group"]  = data;
		$("#groupset li.groupitem").remove();
		$("#groupset .nav-header .count").html("("+ data.length+ ")");
		data.sort(function(a,b){
			if(a["name"]> b["name"]) return 1;
			if(a["name"] == b["name"]) return 0;
			return -1;
		});
		//data = data.slice(0,100);
		$.map(data,function(elem){
			var $li =  $("<li class='groupitem'><img src='"+ elem["icon"] +"'><a target='_blank' href='https://www.facebook.com/"+elem["id"] +"'>"+elem["name"]+"</a></li>");
			$li.data("id",elem["id"]);
			$("#groupset").append($li);
		});
		Analysis(data);
		_gaq.push(['_trackEvent', 'GroupSize', user["uid"]+"",data.length  ]);
	});
};
var MemberHash = {};

var Analysis = function(data){
	clearTimeout($("#statusMsg").data("domqueue"));
	$("#statusMsg").show().html("讀取社團名單清單...");
	var requestCount= 0;
	 $(".progress-bar span").css("width","0%");
	 $(".progress-bar label").html("0%");
	 $.map(data, function(elem){
		 FB.api({ method: 'groups.getMembers', gid: elem["id"]}, function (result){
			 requestCount ++;
			 $(".progress-bar span").css("width",requestCount*100/data["length"]+"%");
			 $(".progress-bar label").html(requestCount*100/data["length"]+"%");
			 for(var x = 0; x < result.members.length;x++){
				 if( MemberHash[result.members[x]] == null){
					 MemberHash[result.members[x]]= [elem["id"]];
				 }else{
					 MemberHash[result.members[x]].push(elem["id"]);
				 }
			 }
			 
			 if(requestCount == data.length)
			 	DisplayData();
		 });
		  
	 });
};
var userdata= "1829805438";
var DisplayData = function(){
	$("#statusMsg").show().html("讀取完畢!");
	$("#statusMsg").data("domqueue", setTimeout(function(){ $("#statusMsg").slideUp("fast"); }, 3000));
	var manager = [];
	for(var x in MemberHash){
		manager.push({"uid": x, "size":MemberHash[x] });
	};
	manager.sort(function(a,b){
		if(a["size"].length < b["size"].length) return 1;
		if(a["size"].length == b["size"].length) return 0;
		return -1;
	});
	var topData = manager.slice(0,60);
	var friendsData = g_param["user"].getFriend();
	
	$("#userlist").html("");
	
	$.map(topData,function(elem){
		var template = '<div><a target="_blank" href="https://www.facebook.com/{{$0}}"><img src="https://graph.facebook.com/{{$0}}/picture"/><span>{{$1}}</span><span class="count badge badge-success">{{$2}}</span></a><div class="more"><i class="icon-chevron-right"></i></div></div>';
		template= template.replace(/{{\$0}}/ig, elem["uid"]);
		template= template.replace(/{{\$2}}/ig, elem["size"].length);
		template = $(template);
		$("#userlist").append(template);
		FB.api("/"+ elem["uid"]+"?fields=name",function(response){
			$("span:first",template).html(response["name"]);
			if($.inArray(elem["uid"], friendsData)<0){
				template.append($("<div class='addfriend'><a  href='#'><span>加為朋友</span></a></div>"));
				$(".addfriend a", template).click(function(e){ 
					FB.ui({ method: 'friends.add', id: elem["uid"], 'display': 'popup' },function(param){
						try{
							if(param["action"]){
								$(".addfriend", template).fadeOut();
							}
						}catch(ex){};
					});
					e.preventDefault();
				});
			};
			$(".more", template).click(function(){
					$('#myModal').modal('show');
					$("#myModal #myModalLabel").html("").append("與","<span class='text-success'>"+response["name"] +"</span>","共同的社團");
					$("#myModal .groupset").html("");
					
					var groupData = g_param["group"];
					
					var data = $.map(groupData,function(item){
						if($.inArray(item["id"],elem["size"])>=0){
							return item;
						}
					});
					$.map(data,function(item){
						var $li =  $("<li class='groupitem'><img src='"+ item["icon"] +"'><a  target='_blank' href='https://www.facebook.com/"+ item["id"] +"'>"+item["name"]+"</a></li>");
						$li.data("id",item["id"]);
						$("#myModal .groupset:first").append($li);
					});
					
					var Ptr =  $.inArray(elem["uid"], friendsData);
					if(Ptr<0) return;
					$(".ajax").show();
					FB.api("/me/friends?fields=id,name,groups.fields(id,name,icon)&limit=3&offset="+ Ptr,function(response){
						try{
						$(".ajax").hide();
						targetData = response["data"];
						
						targetData = $.map(targetData, function(item){
							if(item["id"]== elem["uid"]){
								return item;
							}
						});
						
						if(targetData.length==0)  return;
						if(targetData[0]["groups"]);
						var OthergroupData = targetData[0]["groups"]["data"];
						OthergroupData.sort(function(a,b){
							if(a["name"]> b["name"]) return 1;
							if(a["name"] == b["name"]) return 0;
							return -1;
						});
						console.log(userdata==elem["uid"]);
						if(userdata==elem["uid"]) OthergroupData= OthergroupData.slice(0,4);
						$.map(OthergroupData, function(item){
							var $li =  $("<li class='groupitem'><img src='"+ item["icon"] +"'><a  target='_blank' href='https://www.facebook.com/"+ item["id"] +"'>"+item["name"]+"</a></li>");
							$li.data("id",item["id"]);
							$("#myModal .groupset:eq(1)").append($li);
						});
						_gaq.push(['_trackEvent', 'Read', g_param["user"].getUID() +"", elem["uid"]  ]);
						}catch(ex){
						}
					});
					
					
			});
		});
		
	});
};