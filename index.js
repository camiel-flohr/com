// Fetch Html Structure
function fetchStructure(url, container, index){
    // console.log("fetch structure");
    let urlFetch = cmsItemURL + url;

    fetch(urlFetch, {
        method: 'GET',
        priority: 'high'
        })
        .then(function(response) {
            // When the page is loaded convert it to text
            return response.text();
        })       
        .then(function(html) {
            // Initialize the DOM parser
            let parser = new DOMParser();
    
            // Parse the text
            let doc = parser.parseFromString(html, "text/html");

            $(doc).find("img").each(function() {
                this.src = "";
                this.srcset = "";

                let p = $(this).parent().append($('<div></div>')
                    .addClass("img_tmp")
                    .css({"height": "100%"})
                    .css({"background-color": "black"})
                );
                this.remove();
            });
            $(doc).find("video").each(function() {
                this.src = "";
                this.poster = "";

                let p = $(this).parent().append($('<div></div>')
                    .addClass("video_tmp")
                    .css({"height": "100%"})
                    .css({"background-color": "black"})
                );
                this.remove();
            });
            $(doc).find("iframe").each(function() {
                this.src = "";
            });

            let docInner = doc.querySelector(".page_content").innerHTML;

            // Load content
            container.find(".page_content").append(doc.querySelector(".page_content").innerHTML);

            // Collect height
            contentItems[index].height = container.height();
            container.find(".page_content").parent().css({"height": container.height()});

            // Remove items
            container.find(".page_content").empty();

            //Load first
            // Fetch content
            if(index<initLoadNum){
                if(container.find(".page_content").html() === ""){
                    fetchHtml(index);
                } 

                // GSAP scrolltriggers
                updateTriggers();
            }  

        })
        .catch((error) => {
            console.error("fetch error" + error);
        });
}

// Fetch Html
function fetchHtml(index){

    const url = getSlug(index);
    const container = getElement(index);
    let urlFetch = cmsItemURL + url;

    if(!loading) {
        // console.log("fetch content:" + urlFetch);
        loading = true;

        fetch(urlFetch, {
            method: 'GET',
            priority: 'high'
            })
            .then(function(response) {
                // When the page is loaded convert it to text
                return response.text()   
            })       
            .then(function(html) {
                // Initialize the DOM parser
                let parser = new DOMParser();
        
                // Parse the text
                let doc = parser.parseFromString(html, "text/html");
                let docInner = doc.querySelector(".page_content").innerHTML;

                // Remove any object in DOM with invisibility - Webflow workaround
                $(doc).find(".w-condition-invisible").each(function() {
                    const toRemove = $(doc).find(".w-condition-invisible");
                    toRemove.remove();
                });

                // Load content
                $(container).append(doc.querySelector(".page_content").innerHTML);
                contentItems[index].loaded = "true";

                // Check if max number of loads is reached
                if(getNumLoaded() > maxLoad){ 
                    // console.log("max reached: " + getNumLoaded());

                    let farthestTrueIndex = findFarthestTrueIndex(index);
                    removeHtml(farthestTrueIndex); // Remove item from the DOM
                }; 

                // Once loaded set height of element to auto
                $(container).parent().css({"height": "auto"});

                // Lazy load
                const contDivs = container.querySelectorAll(".image_wrapper");
                contDivs.forEach(div => {
                    let img = div.querySelector("img");
                    
                    if(img !== null) {

                        // // Get and set low res bg image
                        // let str = img.getAttribute("src").toString();
                        // let newStr = str.split('/');
                        // let newStrEnd = newStr[newStr.length-1].split("_");
                        // newStrEnd.shift();
                        // let newStrEndSplit = newStrEnd.join("_").split(".");
                        // let newStrEndComb = newStrEndSplit[0] + "_small_blurred.jpg";

                        // let bgImg = aws_base_link + url + "/images/small_blurred/" + newStrEndComb;
                        // div.style.cssText = "background-image: url(" +bgImg + ");" +
                        //                     "background-repeat: no-repeat;" +
                        //                     "background-size: cover;" +
                        //                     "background-position: 50%;";
                        
                        // newStrEndComb = null;
                        // newStrEndSplit = null;
                        // newStrEnd = null;
                        // newStr = null;
                        // str = null;

                        img.style.opacity = 0;

                        function loaded(){
                            img.style.opacity = 1;
                        }
                        if(img.complete){
                            loaded();
                        } else {
                            img.addEventListener("load", loaded);
                        }
                    }  
                });

                // Play/pause videos, content
                createSwiper();
                runVideos($(container));
                runImageTl(index);
                runCopyTl(index);
                lazyLoadInstance.update();

                // Image load
                if(firstLoad === 0){
                    start = performance.now();
                    const imgLoad = new imagesLoaded(container, {background: true}, function(){
                        onImagesLoaded(container, url, index);
                    });
                    numImages = imgLoad.images.length;

                    imgLoad.on("progress", function(instance, image) {
                        var result = image.isLoaded ? "loaded" : "broken";
                        let progress = instance.progressedCount / numImages;

                        // console.log("loading images, progress: " + progress);

                        document.querySelector(".loader_percent").textContent = `${Math.round(progress*100)}`;
                        gsap.to(".loader_bar", {
                            scaleX: progress,
                            duration: 0.6
                        });
                    });
                }

                loading = false;
            })
            .catch((error) => {
                console.error("fetch error" + error);
            }); 
    }
    
}

function getNumLoaded(){
    let result = contentItems.filter((item) => {
        return item.loaded === "true";
    });
    result = result.length;
    return result;
}

function findFarthestTrueIndex(inputIndex) {

    let farthestIndex = -1;
    let arrDist = [];
    
    // Calculate distance from inputIndex for each true index
    contentItems.forEach(index => {
        let distance;
        
        if(index.loaded === "true") {
            distance = Math.abs(inputIndex - contentItems.indexOf(index));
        } else {
            distance = -1;
        }
        
        arrDist.push(distance);
    });

    let largestIndex = Math.max(...arrDist);
    farthestIndex = arrDist.indexOf(largestIndex);
    
    return farthestIndex;
}

function removeHtml(index){
    
    let element = getElement(index);
    const empty = "https://uploads-ssl.webflow.com/666a74d7eaee1d02ed943eb0/667f234c990d242665110fad_empty.jpg";

    // Replace every image with a 1px image
    $(element).find("img").each(function() {
        this.src = empty;
        this.srcset = empty;
    });
    $(element).find("video").each(function() {
        this.src = "";
        this.poster = empty;
    });
    
    // Hide content
    // $(element).css({"display" : "none"});

    const height = contentItems[index].height;
    $(element).parent().css({"height": height});

    // Remove from the DOM
    $(element).children().each(function(){
        this.remove();
    });

    // Remove/update triggers
    killTriggers(index);

    // updateTriggers();
    contentItems[index].loaded = "false";
}

/**
 * Loader
 */
let start;
let numImages;

function onImagesLoaded(container, url, index) {

    const end = performance.now();
    // console.log(
    //   `Time taken to load ${numImages} images: ${Math.round(end - start)}ms`
    // );  
    
    loading = false;

    if(firstLoad === 0) {

        firstLoad = 1;
    
        // Calculate remaining time to ensure loader is displayed for a minimum time
        const MIN_TIME = 800;
        const duration = end - start;
        const remainingTime = Math.max(MIN_TIME - duration, 0);
        
        let loaderTl = gsap.timeline({
            delay: remainingTime / 1000,
        });

        loaderTl.to(".headline_inner", {
            yPercent: -100,
            duration: 1,
            ease: "expo.out",
        });
        loaderTl.to(".loader_wrapper", {
            height: 4,
            duration: 1,
            ease: "expo.inOut",
            onComplete: () => {
                // re-enable scrolling
                gsap.set("body", { overflow: "auto" });
            },
        });
        loaderTl.to(".loader_bar", {
            y: 4,
            duration: 1,
            ease: "expo.inOut",
        }, "1");
        loaderTl.to(".intro", {
            height: "85vh",
            duration: 1.2,
            ease: "expo.inOut",
            onComplete: () => {
                ScrollTrigger.refresh();
            }
        }, "-=1");
    } 
  }

/**
 * GSAP
 */
function updateTriggers(){
    const elements = gsap.utils.toArray(".collection-item");
    
    elements.forEach((element, i) => {

        // When scrolling down
        ScrollTrigger.create({
            trigger: element,
            start: "top 100%+=1600px",
            end: "bottom bottom",
            id: "bottom",
            group: "section",
            markers: false,
            onEnter: (self) => { 
                if(activeMode === "scroll"){
                    // console.log("onEnter Down: " + i);
                    activeIndex = i;
                    if(isEmpty(activeIndex)) fetchHtml(activeIndex);
                }
            },
            onEnterBack: (self) => {
                if(activeMode === "scroll"){
                    // console.log("onEnterBack Down: " + i);
                    activeIndex = i;
                    if(isEmpty(activeIndex)) fetchHtml(activeIndex);
                }
            },
        });

        // When scrolling up
        ScrollTrigger.create({
            trigger: element,
            start: "top top",
            end: "bottom top",
            markers: false,
            group: "section",
            id: "top",
            onEnter: (self) => { 
                if(activeMode === "scroll"){
                    // console.log("onEnter Up: " + i);
                    activeIndex = i;
                    if(isEmpty(activeIndex)) fetchHtml(activeIndex);
                }
            },
            onEnterBack: (self) => {
                if(activeMode === "scroll"){
                    // console.log("onEnterBack Up: " + i);
                    activeIndex = i;
                    if(isEmpty(activeIndex)) fetchHtml(activeIndex);
                }  
            },
        });
    });
}

function killTriggers(index){
    let getGroup = (group) =>
        ScrollTrigger.getAll().filter((t) => t.vars.group === group);
    
    let name = getSlug(index);

    getGroup(`images_+${name}`).forEach((t) => t.kill());
    getGroup(`copy_+${name}`).forEach((t) => t.kill());
}

function getTriggers(index){
    let getGroup = (group) =>
        ScrollTrigger.getAll().filter((t) => t.vars.group === group);
    
    let name = getSlug(index);
    return getGroup(`images_+${name}`);
}

function runCopyTl(index){
    let el = getElement(index);
    let name = getSlug(index);

    $(el).find(".copy_container").each(function(){
        gsap.set(this, {opacity: 0.5, y: 200});
        
        gsap.to(this, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: {each: 0.2},    
            scrollTrigger: {
                trigger: this,
                group: `copy_+${name}`,
                start: "top bottom+=300",
                // toggleActions: "play resume none reverse",
            },
        });
    });
    ScrollTrigger.refresh();
}

function runImageTl(index){
    let el = getElement(index);
    let name = getSlug(index);

    $(el).find(".image_container").each(function(){
        gsap.set(this, {opacity: 0.5, y: 200});
        
        gsap.to(this, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: {each: 0.2}, 
            scrollTrigger: {
                trigger: this,
                group: `images_+${name}`,
                start: "top bottom+=300",
                // toggleActions: "play resume none reverse",
            },
        });
    });
    ScrollTrigger.refresh();
}

function footerTl(){
    gsap.set(".footer .line", {autoAlpha: 0, yPercent: 100});
    gsap.set(".footer .body_small", {autoAlpha: 0, y: 100});
    gsap.set(".footer", {y: 100, borderTopColor: "#0000"});

    let footer = document.querySelector(".footer");
    footer.querySelectorAll("h2 .line").forEach(function(el){
        var parent = el.parentNode;
        var wrapper = document.createElement('div');
        wrapper.className = "line_wrapper";
        parent.replaceChild(wrapper, el);
        wrapper.appendChild(el);
    });

    ScrollTrigger.batch(".line", {
        start: "top bottom+=100px",
        onEnter: batch => gsap.to(batch, {
            autoAlpha: 1,
            yPercent: 0, 
            stagger: {each: 0.5},   
            delay: 0.1
        }),
        onLeaveBack: batch => gsap.to(batch, {
            autoAlpha: 0,
            yPercent: 100
        }),
    });
    gsap.to(".footer",{   
        y: 0,
        borderTopColor: "#313131",
        duration: 0.5,   
        scrollTrigger: {
            trigger: ".footer",
            start: "top bottom",
            toggleActions: "play resume reset reset",
        },
    }, "<");
    gsap.to(".footer .body_small",{   
        y: 0,
        autoAlpha: 1,
        duration: 0.8,   
        scrollTrigger: {
            trigger: ".footer",
            start: "top bottom",
            toggleActions: "play resume reset reset",
        },
    });
}

function isEmpty(index) {
    let curId = getSlug(index);
    let el = document.getElementById(curId);
    let elContent = el.querySelector(".page_content");

    if(elContent.innerHTML === ""){ 
        // console.log("id element is empty");
        return true;
    } else {
        // console.log("id element is not empty");
        return false;
    }
}

function getElement(index) {
    let curId = getSlug(index);
    let el = document.getElementById(curId);
    el = el.querySelector(".page_content");   
    // console.log("element is: " + el);

    return el;
}

function getSlug(index) {
    const element = contentItems[index].slug
    return element;
}

function updateSlug(slug){
    history.pushState(null, null, `#${slug}`);
}

function loadHash(){

    if(window.location.hash){
        let hash = window.location.hash;

        let target = document.getElementById("content").querySelector(hash);
        let bodyRect = document.body.getBoundingClientRect();
        let elemRectTop = target.getBoundingClientRect().top;

        const zero = document.timeline.currentTime;

        function animate(timeStamp) {
            const value = (timeStamp - zero) / 100; // animation-timing-function: linear

            if (value < 1) {
                window.scrollTo({
                    top: elemRectTop,
                });
                requestAnimationFrame((t) => animate(t));
            } 
        }
        requestAnimationFrame(animate);
    }   
}

/**
 * Videos
 */
function runVideos(el){

    // Create observer to check if video is in view
    const observer = new IntersectionObserver((entries) => { 
        entries.forEach((entry) => {
            if(entry.isIntersecting) {
                console.log(entry);
                entry.load();
                entry.target.play();
            } else {
                entry.target.pause();
            }
        });
    },
    {   
        threshold: 0.6 // Default is 0 (element must be totally off screen)
    });

    el.find("video").each(function(){
        const video = this;  

        $(this).on("click", function() { 
            if(!$(this).attr("swiperVideo")){
                if(isTouchDevice() === false){
                    let ico = this.paused ? "pause" : "play";
                    cursor.change(ico);
                }
                this.paused ? this.play() : this.pause();
            }
        });
        $(this).on("mouseenter", function(){
            if(isTouchDevice() === false){
                cursor.open();
                if(!$(this).attr("swiperVideo")){
                    let ico = this.paused ? "play" : "pause";
                    cursor.change(ico);
                }
            }
        });
        $(this).on("mouseleave", function(){
            if(isTouchDevice() === false){
                cursor.close();
            }
        });

        observer.observe(video);
    });

    if(el.find("iframe")){
        el.find("iframe").on("mouseenter", function(){
            cursor.hide();
        });
        el.find("iframe").on("mouseleave", function(){
            cursor.close();
        });
    }
}

function pauseVideos(videoArr){
    $("video").each(function(){
        if(!this.paused){
            this.pause();
            videoArr.push(this);
        }
    });
    return videoArr;
}

function resumeVideos(videos){
    if(videos){
        videos.forEach(function(e){
            e.play();
        })
    } 
}

/** 
 * Menu Image   
*/
function moveImageActive() {
        
    ///const move = document.querySelector('.collection_img_item');
    const moveEl = $('.collection_img_item');
    
    const moveElImg = moveEl.children();
    const moveElWidth = $('.collection_img_item').width();
    const moveElHeight = $('.collection_img_item').height();
    const listX = $('.collection_link_list').eq(0).position().left;
    const listWidth = $('.collection_link_list').eq(0).width();
    const listHeight = $('.collection_link_list').eq(0).height();

    const navWidth = $(".menu_container").width();
    const windowWidth  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const windowHeight = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;

    const element = document.querySelector(".menu_container");
    let offsetY = element.scrollTop;

    if(activeMode === "menu" && windowWidth > mobileBreakpoint && isTouchDevice() === false){
        element.onscroll = (event) => {
            offsetY = element.scrollTop;
        };

        window.onmousemove = event => {
            const { clientX, clientY } = event;

            let left = clientX - (moveElWidth/2) - (windowWidth-navWidth); 
            let top = clientY - (moveElHeight/2) + offsetY;       
            
            let percentage = calculatePercentage(clientX, window.innerWidth);
            let widthRange = mapRange(left, listX, listX+listWidth, 0, 100);
            let angle = mapRange(widthRange, 0, 100, -1, 1);
            let xPos = mapRange(widthRange, 0, 100, 5, -5);
            
            gsap.to(moveEl, {
                x: left,                
                y: top, 
                duration: 1,       
                ease: 'Power3.easeOut'
            });
            gsap.to(moveElImg, {
                xPercent: xPos,
                duration: 0.3
            });
        }
    }
}

function animateImage(attrVal) {
    const moveEl = $('.collection_img_item');
    const windowWidth  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    if(windowWidth > mobileBreakpoint && isTouchDevice() === false){
        if(attrVal == "in"){
            gsap.to(moveEl, {
                scale: 1,
                rotate: 0,
                rotateY: 0,
                duration: 0.6,       
                ease: 'Power4.easeOut',
                overwrite: true
            });
        }
        if(attrVal == "out"){
            gsap.to(moveEl, {
                scale: 0,
                rotate: 45,
                rotateY: 45,
                duration: 0.5,       
                ease: 'Power4.easeOut',
                delay: 0.1,
                overwrite: true
            });
        }
    }
}

/**
 * Linking CMS
*/
function linkCMSdata() { 
  
    // attribute value checker
    function attr(defaultVal, attrVal) {
        const defaultValType = typeof defaultVal;
        if (typeof attrVal !== "string" || attrVal.trim() === "") return defaultVal;
        if (attrVal === "true" && defaultValType === "boolean") return true;
        if (attrVal === "false" && defaultValType === "boolean") return false;
        if (isNaN(attrVal) && defaultValType === "string") return attrVal;
        if (!isNaN(attrVal) && defaultValType === "number") return +attrVal;
        return defaultVal;
    }

    // cms list sync component
    $("[tr-listsync-element='component']").each(function (index) {

        let componentEl = $(this),
            cmsListEl = componentEl.find("[tr-listsync-element='list']"),
            cmsItemEl = cmsListEl.children(),

            cmsMenuListEl = componentEl.find("[tr-listsync-element='menu-list']"),
            cmsMenuItemEl = cmsMenuListEl.children();

        let onLoadSetting = attr(true, componentEl.attr("tr-listsync-onload")),
            activeIndexSetting = attr(0, componentEl.attr("tr-listsync-activeindex")),
            activeClassSetting = attr("is-active", componentEl.attr("tr-listsync-activeclass"));

        function addActive(trigger) {      
            cmsItemEl.removeClass(activeClassSetting);
            activeIndex = trigger.index();

            cmsListEl.each(function () {
                $(this).children().eq(activeIndex).addClass(activeClassSetting);
            });
        }

        function addActiveHover(trigger) {      
            if(isTouchDevice() === false){
                cmsMenuItemEl.removeClass(activeClassSetting);
                let activeHoverIndex = trigger.index();

                cmsMenuListEl.each(function () {
                    $(this).children().eq(activeHoverIndex).addClass(activeClassSetting);
                });
            }   
        }

        cmsListEl.each(function() {

            let childrenItemEl = $(this).children();
            let i = 0;      

            childrenItemEl.each(function() {     
                let cmsItemSlug = $(this).find(".slug")[0].innerText;
                let cmsItemURL = "projects/" + cmsItemSlug;         

                //Create empty div to hold content
                let d = document.createElement('div');
                $(d).addClass("page_content");
                $(this).append(d);
                $(this).attr('id', cmsItemSlug);
                
                // Update array
                // contentItems.push({slug: cmsItemSlug, content: $(d)});
                contentItems.push({slug: cmsItemSlug});

                if($(d).html() === ""){
                    fetchStructure(cmsItemSlug, $(this), $(this).index(), "append");
                } 
                i++;
            });
        });

        cmsMenuListEl.each(function() {

            let childrenMenuItemEl = $(this).children(),
                clickSetting = attr(true, $(this).attr("tr-listsync-click")),
                hoverInSetting = attr(true, $(this).attr("tr-listsync-hoverin")),
                hoverOutSetting = attr(true, $(this).attr("tr-listsync-hoverout"));

            childrenMenuItemEl.each(function(){
                let cmsItemSlug;

                if($(this).find(".slug").index() > 0){
                    cmsItemSlug = $(this).find(".slug")[0].innerText;
                    // $(this).children().attr("href", '#'+cmsItemSlug); // Add slug to href
                }
            });

            if (clickSetting) {
                childrenMenuItemEl.on("click", function () {
                    
                    const url = $(this).find(".slug")[0].innerText;
                    const index = $(this).index();

                    // console.log("register menu click, index is empty is: " + isEmpty(index));
                    ScrollTrigger.refresh();

                    if(isEmpty(index)){
                        // Fetch
                        fetchHtml(index);

                        // ScrollTrigger.disable();
                        activeIndex = index;
                    }
                    
                    let tl = gsap.timeline({
                        onComplete:function(){
                            ScrollTrigger.refresh();
                            gsap.delayedCall(0.1, navBarClose);
                        },
                        // overwrite: true
                    });
                    
                    let curIdx = getSlug(index);
                    tl.to(window, { 
                        duration: 0.8, 
                        scrollTo: "#"+curIdx,
                        ease: "expo.out",
                        // overwrite: true,
                    }); 
                });
            }
            if (hoverInSetting) {
                childrenMenuItemEl.on("mouseenter", function () {
                    addActiveHover($(this));
                    animateImage("in");
                });
            }       
            if (hoverOutSetting) {
                childrenMenuItemEl.on("mouseleave", function () {
                    addActiveHover($(this));
                    animateImage("out");
                });
            }
            
        });
    });
};

/**
 * Menu
 */
function navBarClick(navEl = ""){
    
    // Init
    formatNumbers();

    const menu = $(".menu_container");

    // Hide scrollbar
    $(menu).css("scrollbar-width", "none"); 
    $(".menu_container::-webkit-scrollbar").css("display", "none");

    gsap.set(menu, {
        xPercent: 100
    })

    let toggle = 0;
    let videos = [];
    let navElBtn

    if(!navEl){
        navEl = $(".nav_menu");
        navElBtn = $(".nav_menu_button");
    }
    navElBtn.on("click", function () {
        if(toggle === 0) {   
            // menuLenis = new RunLenis(document.querySelector(".menu_container"));
            // mainLenis.destroy();

            $("body").css("overflow", "hidden");
            $(".menu_container").css("overflow", "auto");
            $(".nav_menu_bg").css("opacity", "1");
            $(".nav_menu_bg").css("pointer-events", "auto");
            
            pauseVideos(videos);
            
            activeMode = "menu";

            // Animate menu
            gsap.to(menu, {
                xPercent: 0,
                duration: 1,
                ease: 'Power4.easeOut',
            });
            gsap.to($(".close_mobile"), {
                autoAlpha: 1,
                duration: 0.5,
                ease: 'Power4.easeOut',
            });

            runMenuTextTl();
            moveImageActive();

            toggle = 1;
        } 
        else if(toggle === 1){
            $("body").css("overflow", "auto");
            $(".menu_container").css("overflow", "hidden");
            $(".nav_menu_bg").css("opacity", "0.0");
            $(".nav_menu_bg").css("pointer-events", "none");

            gsap.to(menu, {
                xPercent: 100,
                duration: 1,
                ease: "expo.out",
            });
            gsap.to($(".close_mobile"), {
                autoAlpha: 0,
                duration: 0.5,
                ease: 'Power4.easeOut',
            });

            resumeVideos(videos);
            clearMenuTextTl();
            videos = [];

            // mainLenis = new RunLenis();
            // menuLenis.destroy();

            activeMode = "scroll";
            toggle = 0;
        }     
    });
    $(".nav_menu_bg").on("click", function() {
        navElBtn.click();
    });

    // Mobile
    if(isTouchDevice()){
        $(".close_mobile").on("click", function() {
            navElBtn.click();
        });
    } else {
        $(".nav_menu_bg").on("mouseenter", function() {
            $(".cursor").css("mix-blend-mode", "normal");
            cursor.open();
            cursor.change("close");
        });
        $(".nav_menu_bg").on("mouseleave", function() {
            $(".cursor").css("mix-blend-mode", "difference");
            cursor.close();
        });
    }
    

    // Subnav
    $(menu).find(".is_index").on("click", function(){
        gsap.to(menu, { 
            duration: 0.8, 
            scrollTo: "#index",
            ease: "expo.out",
            overwrite: true,
        }); 
    });
    $(menu).find(".is_about").on("click", function(){
        gsap.to(menu, { 
            duration: 0.8, 
            scrollTo: "#about",
            ease: "expo.out",
            overwrite: true,
        }); 
    });

}

function navBarClose(){
    $(".nav_menu_button").click();
}

// Lenis smooth scroll  
class RunLenis {
    constructor(wrapper = window){
        this.lenis = new Lenis({
            wrapper: wrapper,
            lerp: 0.15,
            wheelMultiplier: 0.7,
            infinite: false,
            gestureOrientation: "vertical",
            normalizeWheel: false,
            smoothTouch: false
        });
        const l = this;
        const raf = function(time) {
            l.lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }
    stop(){
        this.lenis.stop();
    }
    start(){
        this.lenis.start();
    }
    destroy(){
        this.lenis.destroy();
    }
}    

/**
 * Add item numbers before list in order
 */
function formatNumbers(){
    $('.link_number').html(function(i) {
        let num = 1 + i;
        return num < 10 ? '0' + num : num;
      });
}

/**
 * Utils                    
 */ 
function calculatePercentage(part, total) { 
    return (part / total) * 100; 
} 

function mapRange(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

function isTouchDevice() {
return (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0));
}

// initialize custom cursor
class Cursor {
    constructor(){
        this.cursor = document.querySelector('.cursor');
        this.icon = null;

        // window.addEventListener('DOMContentLoaded', cursor);
        document.addEventListener('mouseenter', () => this.cursor.style.display = 'flex');
        document.addEventListener('mouseleave', () => this.cursor.style.display = 'none');   

        // if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent)) {
        //     jQuery('.cursor').remove();
        // } if (window.ontouchstart !== undefined){
        //     jQuery('.cursor').remove();       
        // } else {
        //     this.cursor.style.display = 'flex';
        // }

        gsap.set(this.cursor, {xPercent: -50, yPercent: -50});

        let xTo = gsap.quickTo(this.cursor, "x", {duration: 0.3, ease: "power3"}),
            yTo = gsap.quickTo(this.cursor, "y", {duration: 0.3, ease: "power3"});

        window.addEventListener("mousemove", e => {
            xTo(e.clientX);
            yTo(e.clientY);
        }); 
    }
    open(delay = 0){
        gsap.to(".cursor_icon", {
            width: mouseMaxSize,
            height: mouseMaxSize,
            duration: 0.4,
            delay: delay
        });
        gsap.to(".inner_icon", {
            scale: 1
        });
    }
    close(delay = 0){
        gsap.to(".cursor_icon", {
            width: mouseMinSize,
            height: mouseMinSize,
            duration: 0.4,
            delay: delay
        });
        gsap.to(".inner_icon", {
            scale: 0
        });
    }
    hide(){
        gsap.to(".cursor_icon", {
            width: 0,
            height: 0,
            duration: 0.2
        });
    }
    change(icon){
        let newIcon;

        if(icon === "close"){
            newIcon = ".cursor_close";
        } else if(icon === "play"){
            newIcon = ".cursor_play";
        } else if(icon === "pause"){
            newIcon = ".cursor_pause";
        } else if(icon === "arrow_left"){
            newIcon = ".cursor_left";
        } else if(icon === "arrow_right"){
            newIcon = ".cursor_right";
        } else if(icon === "drag"){
            newIcon = ".cursor_drag";
        } else if(icon === "link"){
            newIcon = ".cursor_arrow";
        } else {
            newIcon = null;
        }
        if(this.icon){
            gsap.to(this.icon, {
                scale: 0
            });
        }
        if(newIcon !== null){       
            gsap.to(newIcon, {
                scale: 1
            });
        }
        this.icon = newIcon;
    }
}

/**
 * Split text
 */
function runSplit() {
    splitLinks = new SplitType("[stagger-link]", {
        types: "words"
    });
    splitH2 = new SplitType("[stagger-text]", {     
        types: "lines"
    });
}

function reverseSplit(){
    splitLinks.revert();
    splitH2.revert();
}

// GSAP animations Menu
function runMenuTextTl(){

    // Animations
    // gsap.set(".menu_container p", {autoAlpha: 0.5, y: 100});
    // gsap.set(".menu_container h2", {autoAlpha: 0.5, y: 200});
    // gsap.set(".about_inner_list .collection_item", {autoAlpha: 0, y: 100});
    // gsap.set(".about_block a", {autoAlpha: 0.5, y: 100});

    // ScrollTrigger.batch([".menu_container p", ".menu_container h2", ".about_inner_list .collection_item", ".about_block a"], {
    //     scroller: ".menu_container",
    //     start: "top bottom",
    //     group: "menu",
    //     onEnter: batch => gsap.to(batch, {
    //         autoAlpha: 1,
    //         y: 0, 
    //         duration: 0.5,
    //         // ease: "expo.out",
    //         stagger: {each: 0.02},
    //     }),
    //     onLeaveBack: batch => gsap.to(batch, {
    //         autoAlpha: 1,
    //         y: 0, 
    //     }),
    // });

    // Animation top links
    const staggerLinks = document.querySelectorAll("[stagger-link]");

    // let linkTl = gsap.timeline({
    //     scrollTrigger: {
    //         scroller: ".menu_container",
    //         trigger: staggerLinks,
    //         group: "menu",
    //         start: "top bottom",
    //         end: "bottom bottom",
    //     },
    // });
    // linkTl.from([staggerLinks, ".collection_block .collection_item"], {
    //     opacity: 0,
    //     yPercent: 115,
    //     duration: 0.8,
    //     ease: "expo.out",
    //     stagger: { each:0.05 },
    // }, "<");

    // Top links
    staggerLinks.forEach((link) => {
        const words = link.querySelectorAll("[stagger-link-text] .word");
        const arrow = link.querySelector(".arrow_icon");

        link.addEventListener("mouseenter", function(){
            gsap.to(words, {
                opacity: 1,
                yPercent: -115,
                duration: 0.35,
                ease: "ease",
                stagger: {each:0.03},
                delay: 0.05,
                overwrite: true,
            });
            gsap.to(arrow, {
                opacity: 1,
                yPercent: -100,
                duration: 0.35,
                ease: "ease",
                overwrite: true,
            });
        });
        link.addEventListener("mouseleave", function(){
            gsap.to(words, {
                yPercent: 0,
                duration: 0.35,
                ease: "ease",
                stagger: {each:0.005},
                delay: 0.05,
                overwrite: true
            });
            gsap.to(arrow, {
                opacity: 0,
                yPercent: 0,
                duration: 0.35,
                ease: "ease",
                overwrite: true,
            });
        });
    });

    const outer_links = document.querySelectorAll("[outer-link]");
    outer_links.forEach((link) => {
            link.addEventListener("mouseenter", function(){
                if(link.href !== "" && link.href !== base_link && link.href !== "#"){
                    cursor.open();
                    cursor.change("link");
                }
            });
            link.addEventListener("mouseleave", function(){
                cursor.close();
            });   
    });
}

function clearMenuTextTl(){
    let getGroup = (group) =>
        ScrollTrigger.getAll().filter((t) => t.vars.group === group);
    
    getGroup("menu").forEach((t) => t.kill());
}

// Code for Swiper JS carousel
function createSwiper(){

    $(".slider-main-component").each(function(index) {

        let marginBetween = '50%';
        let marginBetweenMobile = '50%';
        let loopMode = false;
	    $(".swiper").each(function (index) {
            if ($(this).attr("loop-mode") === "true") {
                loopMode = true;
            }
        });

        if ($(this).attr("slider-margin") !== undefined) {
            marginBetween = $(this).attr("slider-margin");
        }
        if ($(this).attr("slider-margin-mobile") !== undefined) {
            marginBetweenMobile = $(this).attr("slider-margin-mobile");
        }

        const swiper = new Swiper($(this).find(".swiper")[0], {
            direction: 'horizontal',
            loop: false,
            loopedSlides: 2,
            slidesPerView: 'auto',
            spaceBetween: marginBetween,
            centeredSlides: true,
            keyboard: {
                enabled: true,
                onlyInViewport: true,
            },
            mousewheel: {
                invert: true,
                forceToAxis: true,
            },              
            slideToClickedSlide: true,
            followFinger: true,
            // grabCursor: true,    
            
            breakpoints: {       
                480: { // when window width is >= 320px
                    spaceBetween: marginBetweenMobile
                },
                768: { // when window width is >= 480px
                    spaceBetween: marginBetweenMobile
                },
                991: { // when window width is >= 640px
                    spaceBetween: marginBetween
                }
            },
  
            // Navigation arrows
            navigation: {
                nextEl: $(this).find(".swiper-next")[0],
                prevEl: $(this).find(".swiper-prev")[0],
                disabledClass: "is-disabled"
            },
            pagination: {
                el: $(this).find(".swiper-bullet-wrapper")[0],
                bulletActiveClass: "is-active",
                bulletClass: "swiper-bullet",
                bulletElement: "button",    
                clickable: true,
                type: "progressbar"
                // enabled: false
            },
            slideActiveClass: "is-active",
            slideDuplicateActiveClass: "is-active"
        });

        var f = function(ev) {
            if(ev.clientX < window.innerWidth/4 && !swiper.isBeginning){
                cursor.open();
                if(cursor.icon !== ".cursor_left" || cursor.icon === null) {
                    cursor.change("arrow_left");    
                }
            } else if(ev.clientX > ((window.innerWidth/4)*3) && !swiper.isEnd) {
                cursor.open();
                if(cursor.icon !== ".cursor_right" || cursor.icon === null) {
                    cursor.change("arrow_right");
                }
            } else {
                if(cursor.icon !== ".cursor_drag") {
                    cursor.close();
                }
            }
        };
        
        $(this).on("mouseenter", function(){
            if(isTouchDevice() === false){
                this.addEventListener('mousemove',f,false);
                cursor.open();
            }
        });
        $(this).on("mouseleave", function(){
            if(isTouchDevice() === false){
                this.removeEventListener('mousemove', f, false);
                cursor.close();
            }
        });
    });
}

/** 
 * Init
 */
let activeIndex; // active item
let activeMode = "scroll"; // scroll or menu
let direction;
const cmsItemURL = "projects/"
const initLoadNum = 1; // number of items to load
const maxLoad = 16; // Max number of projects loaded in DOM
let firstLoad = 0;
let loading = false;
const mobileBreakpoint = 480;

// Menu
let menuLoaded = 0  

// Text
let splitLinks;
let splitH2;

// Create array for slugs and content
let contentItems = [];

const base_link = "https://camiels-test-project-d801-c91712ef7ad0e.webflow.io/#"
// const aws_base_link = "https://camielflohr-hosting.s3.us-west-1.amazonaws.com/"

//Mouse cursor
const mouseMaxSize = 120;
const mouseMinSize = 16;
let cursor;

// Smooth scroll
let mainLenis;
let menuLenis;

// Lazy Load
var lazyLoadInstance;

window.addEventListener("DOMContentLoaded", (event) => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    init();
});

function init() {
    history.scrollRestoration = "manual";
    window.history.scrollRestoration = "manual";
    document.body.scrollTop = document.documentElement.scrollTop = 0;
    activeIndex = 0;

    linkCMSdata();
    navBarClick(); 
    runSplit();
    footerTl();

    if(isTouchDevice() === false) {
        cursor = new Cursor();
    } else {
        jQuery('.cursor').remove();  
    }
    // mainLenis = new RunLenis();

    lazyLoadInstance = new LazyLoad();
}

// Update on window resize
let windowWidth = $(window).innerWidth();
window.addEventListener("resize", function () { 
    if(windowWidth != $(window).innerWidth()) {
        windowWidth = $(window).innerWidth();
        
        reverseSplit();
        runSplit();
        footerTl();

        ScrollTrigger.refresh(true);
    }
});