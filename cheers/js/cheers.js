$(function(){
    // 初始隱藏找店、優惠板塊
    // $(".article_list").hide();
    $(".shop_list").hide();
    $(".coupon_list").hide();
    $(".list_menu span").click(function(){
        $(".list_menu span").removeClass("selected_menu");
        $(this).addClass("selected_menu");
        $(".article_list,.shop_list,.coupon_list").hide();
        var showList = $(this).attr("id") + "list";
        $("."+showList).show();
    })


    // 手机-menu
    $(".mobile_menu li").click(function(){
        $(".article_list,.shop_list,.coupon_list").hide();
        var showList = $(this).attr("id") + "_list";
        $("."+showList).show();
        $(".mobile_menu").hide();
    })
    // 点击-moblie-menu
    $(".menu_mo img").click(function(e){
        e.stopPropagation(); //阻止冒泡事件向上
        $('.mobile_menu').slideToggle();
    })
    $(window).scroll(function(){
        $('.mobile_menu').fadeOut();
    });
    $(window).click(function(){
        $('.mobile_menu').fadeOut();
    });
    


})



// 判断是否移动端
var u = navigator.userAgent;
var page_height = document.documentElement.clientHeight;
if (u.indexOf("Android")>-1 || u.indexOf("iPhone")>-1 || u.indexOf('Linux') > -1) {  //移动端(iPad处外)
    // 測試-改變找店的導航欄
    $(".shop_nav").attr("id","shop_menu");
    $(".shop_nav").addClass("swiper-container");
    $(".shop_menu").addClass("swiper-wrapper");
    $(".shop_menu").removeClass("shop_pc");
    $(".shop_menu div").addClass("swiper-slide");

    // 找店-導航
    var mySwiper2 = new Swiper('#shop_menu', {
        watchSlidesProgress: true,
        watchSlidesVisibility: true,
        slidesPerView: 6,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });

    // 手机banner解禁滑动
    $('#home_banner').removeClass("swiper-no-swiping");

}else{

}



// 定位
function getLocation(){
	if (navigator.geolocation){
		navigator.geolocation.getCurrentPosition(showPosition,showError);
	}else{
		alert("浏览器不支持地理定位。");
	}
}

function showError(error){
	switch(error.code) {
		case error.PERMISSION_DENIED:
			alert("定位失败,用户拒绝请求地理定位");
			break;
		case error.POSITION_UNAVAILABLE:
			alert("定位失败,位置信息是不可用");
			break;
		case error.TIMEOUT:
			alert("定位失败,请求获取用户位置超时");
			break;
		case error.UNKNOWN_ERROR:
			alert("定位失败,定位系统失效");
			break;
    }
}

//解析url路径,获取参数
    function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}


// 获取cookie值
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
} 


// 首页banner图-data
function bannerData(){
    var  filed = {
        pp : '',
        p : ''
    }
    $.ajax({
        type: "POST",
        url: "http://test.atomtechnology.com.hk/News/Slides",
        dataType: "json",
        data: filed,
        
        success: function (msg) {

            $(".banner_box").empty();

            for(var i=0; i<msg.Data.length; i++){
                var a_url = '';
                if(msg.Data[i].Type == 'Activity'){
                    a_url = "article-content.html?aId="+msg.Data[i].Action;
                }else if(msg.Data[i].Type == 'Http'){
                    a_url = msg.Data[i].Action;
                }
                $(".banner_box").append('<div class="swiper-slide" style="background-image: url('+msg.Data[i].Img_url+');"><a class="banner_a" href="'+a_url+'"><h1>'+msg.Data[i].Title+'</h1></a></div>');
            }
            console.log("banner");
            console.log(msg);



            var mySwiper = new Swiper('#home_banner', {
                loop: true, // 循环模式选项
                autoplay: {
                    delay: 20000,
                    stopOnLastSlide: false,
                    disableOnInteraction: false,
                },
                speed:  500,
                fade: {
                    crossFade: true,
                },
                // 如果需要前进后退按钮
                navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
                },
            })
            
        },
        error : function() {
            // alert("异常！");
        }
    });
}



// 文章列表-调取数据（栏目ID，排序【0：最新，1：最近】，页数）
function articleData(categoryID,val_pp,val_p){
    var  filed = {
        CategoryID : categoryID,
        pp : val_pp,
        p : val_p
    }
    $.ajax({

        type: "POST",
        url: "http://test.atomtechnology.com.hk/News/Listing",
        dataType: "json",
        data: filed,
        
        success: function (msg) {
            $(".article_list").empty();

            for(var i=0; i<msg.Data.length; i++){
                $(".article_list").append('<div class="article_box"><div class="article_text"><h1><a href="article-content.html?aId='+msg.Data[i].ID+'">'+msg.Data[i].Title+'</a></h1><p class="article_time">'+msg.Data[i].TimeCreated+'</p><p class="article_readme">'+msg.Data[i].Description+'</p></div><div class="article_img" style="background-image:url('+msg.Data[i].ImageUrl+')"><a href="article-content.html?aId='+msg.Data[i].ID+'"></a></div></div>')

            }

            console.log("文章");
            console.log(msg);
            
        },
        error : function() {
            // alert("异常！");
        }
    });
}



// 找店模块-调取数据（经度，纬度，类别ID，每页条数，页数）
function shopData(lng,lat,Categoryid,val_pp,val_p){
    var  filed = {
        Lng : lng,
        Lat : lat,
        Categoryid : Categoryid,
        pp : val_pp,
        p : val_p
    }
    $.ajax({

        type: "POST",
        url: "http://test.atomtechnology.com.hk/Category/ItemList",
        dataType: "json",
        data: filed,
        
        success: function (msg) {
            
            $(".shop_list_box").empty();
            for(var i=0; i<msg.Data.length; i++){
                // $(".shop_list_box").append('<div class="shop_box"><div class="shop_imgbox" style="background-image:url('+msg.Data[i].ImageUrl+')"><a href="shop-detail.html?shopId='+msg.Data[i].ItemID+'"></a></div><div class="shop_weizhi">'+msg.Data[i].AreaName+'</div><div class="shop_txt"><a href="shop-detail.html?shopId='+msg.Data[i].ItemID+'"><h1 title="'+msg.Data[i].ItemName+'">'+msg.Data[i].ItemName+'</h1></a><div class="shop_lysc"><span>距離:'+msg.Data[i].Distance+'km</span></div>  <div class="client_pj"><div><img src="images/service_hao.png" alt=""><span>味道ok</span></div><div><img src="images/service_hea.png" alt=""><span>唔知飲咗啲咩</span></div><div><img src="images/lzln.png" alt=""><span>影像一流</span></div></div>  <span class="tisp_txt tisp_txt'+msg.Data[i].IsDiscount+'">惠</span></div></div>')

                $(".shop_list_box").append('<div class="shop_box"><div class="shop_imgbox" style="background-image:url('+msg.Data[i].ImageUrl+')"><a href="shop-detail.html?shopId='+msg.Data[i].ItemID+'&lng='+lng+'&lat='+lat+'"></a></div><div class="shop_weizhi">'+msg.Data[i].AreaName+'</div><div class="shop_txt"><a href="shop-detail.html?shopId='+msg.Data[i].ItemID+'&lng='+lng+'&lat='+lat+'"><h1 title="'+msg.Data[i].ItemName+'">'+msg.Data[i].ItemName+'</h1></a><div class="shop_lysc"><span>距離:'+msg.Data[i].Distance+'km</span></div><span class="tisp_txt tisp_txt'+msg.Data[i].IsDiscount+'">惠</span></div></div>')

            }

            console.log("找店");
            console.log(msg);
            
        },
        error : function() {
            // alert("异常！");
        }
    });
}



// 优惠模块-调取数据(经度，纬度，关键词，排序【0：最新，1：最近】，每页条数，页数)
function couponData(lng,lat,keyword,type,val_pp,val_p){
    var  filed = {
        Lng : lng,
        Lat : lat,
        Keyword : keyword,
        Type : type,   //0：最新，1：最近
        pp : val_pp,
        p : val_p
    }
    $.ajax({

        type: "POST",
        url: "http://test.atomtechnology.com.hk/Offer/OfferList",
        dataType: "json",
        data: filed,
        
        success: function (msg) {
            
            console.log("优惠");
            console.log(msg);
            
        },
        error : function() {
            // alert("异常！");
        }
    });
}
