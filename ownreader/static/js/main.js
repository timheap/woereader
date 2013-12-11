////Page Setup
var canTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
var selected;
var showReadItems;
var itemsPerPage;
var newPage;
var newestItem;
var loading = false;
$(document).ready(prepare);
$(window).on('load resize scroll', loadMore);

function prepare() {
	addCaptions();
	setupTouch();
	setupMenus();
	setupExpansion();
	setupHotkeys();
	
	$('body').addClass('js');

	//showRead and itemsPerPage should change only on page reload
	//newestItem is taken so that pages are calculated from there by server
	//newPage is recalculated when new content is taken in
	if($('#next_page').length != 0){
		showReadItems = $('#showRead').val();
		itemsPerPage = $('#itemsPerPage').val();
		newPage = $('#newPage').val();
		newestItem = $('.item').first().attr('id');
	}

	loadMore();
	
	//Makes small-screened devices ignore starting state of sidebar
	if($('#smallscreen').css('visibility')=='visible')
		$('#wrapper').removeClass('sidebar');
}


//UI  setup functions

//Add touch functionality if present
function setupTouch() {
	if(canTouch) {
		$("html").addClass("touch");
	}
}

//Show menus on demand, hide all others
function menuShow($this){
	$this.find('ul').css('display', 'block');
	menuHide($('.menu').not($this));
}

//Hide specific menus on demand
function menuHide($this){
	$this.find('ul').css('display', 'none');
}

//Toggle all menus as required
function menuToggle($this){
	if($this.find('ul').css('display')=='none')
		menuShow($this);
	else
		menuHide($this);
}

//Enable menu functionality
function setupMenus() {
	//Menus should have null locations; don't propagate links otherwise
	$('a').on('click touchstart', (function(e){
		if($(this).attr('href')!='#')
			e.stopPropagation();
	}));
	//Bind js alternatives to the CSS :hover, hides all but selected
	$('.menu:has(ul)').on('click touchstart', (function(e){
		e.stopPropagation(); //stop it from triggering the document event
		e.preventDefault();  //touchscreen devices do both otherwise
		menuToggle($(this));
	}));
	$('.menu').on('mouseenter', (function(){ menuShow($(this)) }));
	$('.menu').on('mouseleave', (function(){ menuHide($(this)) }));
	//Close menus on outside clicks
	$(document).on('click touchstart', (function (e) {
		if(e.which != (2 || 3)){
			menuHide($('.menu'));
		}
	}));
	//Scroll to top on Navbar click
	$('#navbar').click(function (e) {
		window.scrollTo(0,0);
	});
}

//Expand the first item if in collapsed-view
function setupExpansion(){
	selected = $('.item').first();
	selected.addClass('selected');

	if($('#wrapper').hasClass('collapse'))
		showItem($(selected));
}

//Add hotkeys/gestures for non-touch/mouse interaction
function setupHotkeys(){
	$(document).keyup(function(e){
		var code = e.keyCode || e.which;
		switch(code){
			case 78:
				nextItem();
				break;
			case 80:
				previousItem();
				break;
			case 86:
				openItem();
				break;
		}
	});
	$('.item').on("swipeleft", nextItem);
	$('.item').on("swiperight", previousItem);
}

//Expand the next item on the page, hide the current, mark it as read
function nextItem(){
	if(!$(selected).hasClass('read'))
		markAsRead(selected);
	else
		hideItem(selected);
	if(!($(selected).is(":last-child"))){
		selected.removeClass('selected');
		selected = $(selected).next('.item');
		selected.addClass('selected');
		showItem(selected);
	}
	loadMore();
}

//Expand the previous item on the page, hide the current
function previousItem(){
	if(!($(selected).is(":first-child"))){
		hideItem(selected);
		selected.removeClass('selected');
		selected = $(selected).prev('.item');
		selected.addClass('selected');
		showItem(selected);
	}
}

//Opens the url of the currently selected item in a new tab
function openItem(){
	window.open($(selected).find('.item_title a').attr('href'));
}

//Show/hide the sidebar
function sidebarToggle(){
	if($('#wrapper').hasClass('sidebar'))
		$('#wrapper').removeClass('sidebar');
	else
		$('#wrapper').addClass('sidebar');
	
	//Deselect the Button
	$('#sidebarToggle').blur();
	
	//Only change the preference if both can be seen at once
	if($('#smallscreen').css('visibility')!='visible')
		djajax('toggleSidebar', {showSidebar: 'toggle'});
}

//Show/hide items
function toggleShow(itemId){
	var item = '#' + itemId;
	if($(item).hasClass('collapsed'))
		showItem(item);
	else
		hideItem(item);
}

function showItem(item){
	$(item).find('.hider').text("-");
	$(item).removeClass('collapsed');
}

function hideItem(item){
	$(item).find('.hider').text("+");
	$(item).addClass('collapsed');
}

////Grab the next page's items if 5th-to-last item is in view
function loadMore(){
	//Stop the function if we're already loading new items
	if(loading)
		return;

	//Stop the function if there's nothing to load
	if($('#next_page').length == 0)
		return;

	//Stop the function if the 5th-to-last item is not in view
	itemToCheck = $('.item').get(-5);
	if(!isElementVisible(itemToCheck))
		return;

	loading = true;

	//Replaces the formset with the new one, appends the new items
	var update = function(data, textStatus, xhr){
		var $response = data;

		var formset = $('<div />').html(data).find('#allItemsForm').html();
		var newItems = $('<div />').html(data).find('#itemWrapper').html();

		//Remove the new page loader form
		$('#next_page').remove();
		$('#allItemsForm').html(formset);
		$('#itemWrapper').append(newItems);
		//Remove the previous page loader form
		$('#previous_page').remove();
		//Get the value of the next page to load
		newPage = $('#newPage').val();
		//Add captions for any new items retrieved
		addCaptions();
		loading = false;
		//Check that we've fetched enough content
		loadMore();
	};

	djajax(
		"",
		{	page: newPage,
			showRead: showReadItems,
			pageSize: itemsPerPage,
			adding: "True",
			newest: newestItem},
		update);
}

//Check if an element is in view
function isElementVisible(el){
		var eap,
		rect     = el.getBoundingClientRect(),
		docEl    = document.documentElement,
		vWidth   = window.innerWidth || docEl.clientWidth,
		vHeight  = window.innerHeight || docEl.clientHeight,
		efp      = function (x, y) { return document.elementFromPoint(x, y) },
		contains = "contains" in el ? "contains" : "compareDocumentPosition",
		has      = contains == "contains" ? 1 : 0x10;

	// Return false if it's not in the viewport
	if (rect.right < 0 || rect.bottom < 0
			|| rect.left > vWidth || rect.top > vHeight)
		return false;

	// Return true if any of its four corners are visible
	return (
		  (eap = efp(rect.left,  rect.top)) == el
		|| el[contains](eap) == has
		||  (eap = efp(rect.right, rect.top)) == el
		|| el[contains](eap) == has
		||  (eap = efp(rect.right, rect.bottom)) == el
		|| el[contains](eap) == has
		||  (eap = efp(rect.left,  rect.bottom)) == el
		|| el[contains](eap) == has
	);
}



////Appearance fixer functions

//Remove the reqirement for mousing-over to get the mouse-over text from comics
function addCaptions(){
	var imgs = $('.item').find('img[title]').not('.alttaken');
	imgs.each(function(){
		curImg = $(this);
		curImg.parent().append(
			"<div class=\"alttext\">", curImg.attr('title'), "</div>");
		curImg.addClass('alttaken');
	});
}



//Functions for django+ajax

//Retrieve cookies
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(
                	cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

//Test methods for CSRF protection requirement
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

//Pass data to the url via ajax easily, execute function on success
function djajax($url, $data, successFunction){
	var csrftoken = getCookie('csrftoken');
	$.ajax({
		url: $url,
		crossDomain: false,
		type: "POST",
		beforeSend: function(xhr, settings) {
			if (!csrfSafeMethod(settings.type)) {
				xhr.setRequestHeader("X-CSRFToken", csrftoken);
			}
		},
		data: $data,
		success: successFunction
	});
	return false;
}



////Methods that perform specific Client-Server communication

function toggleRead(itemId){
	var item = '#' + itemId;
	if($(item).hasClass('read'))
		markAsRead(item);
	else
		markAsRead(item);
}

function markAsRead(item){
	djajax("toggleRead", { id: $(item).attr('id'), read: "True" });
	$(item).addClass('read');
	hideItem(item);
}

function markAsUnread(item){
	djajax("toggleRead", { id: $(item).attr('id'), read: "False" });
	$(item).removeClass('read');
}

function markAllAsRead(){
	items = $("#allItemsForm").serialize();
	djajax("markRead", items);
	items = $('.item').not('.read');
	items.addClass('read');
	hideItem(items);
}
