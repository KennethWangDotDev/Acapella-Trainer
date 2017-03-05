
var allTracks = [],		// An array for all the files loaded in the track
	playlist = [], 		// An array for the current playlist
	temporarySearchPlaylist = [],	// A helper array for when we are searching
	i = 0, 				// The number of the current track
	shuffle = false,	// Shuffle flag
	repeat = 0,			// Repeat flag
	lastPlayed = [],	// Array for last played (used when shuffling songs)
	timer = 0;			// An interval for the track's current time.


startPlayerWhenReady();


/*---------------------
	Dropping files
----------------------*/

var dropZone = $('#drop-zone'),
	searchInput = $('#searchBox');

$(document).on('dragover', function(event) {
	event.stopPropagation();
	event.preventDefault();

	dropZone.removeClass('hidden');
});

dropZone.on('dragleave', function(event) {
	event.stopPropagation();
	event.preventDefault();

	dropZone.addClass('hidden');
});

dropZone.on('dragover', function(e) {
	e.stopPropagation();
	e.preventDefault();
	e.originalEvent.dataTransfer.dropEffect = 'copy';
});

// Get file data on drop
dropZone.on('drop', function(e) {
	e.stopPropagation();
	e.preventDefault();


	if(e.originalEvent.dataTransfer.items){
		// For chrome users folder upload is supported

		var items = e.originalEvent.dataTransfer.items;
		for(var j=0; j<items.length; j++){
			var item = items[j].webkitGetAsEntry();
			if(item){
				pushSong(item);
			}
		}
	}
	else{
		// Other browser users have to upload files directly

		var files = e.originalEvent.dataTransfer.files;

		for(var j=0; j<files.length; j++){
			if(files[j].type.match(/audio\/(mp3|mpeg)/)){

				getID3Data(files[j], function (song) {
					allTracks.push(song);
					playlist.push(song);
				});
			}
		}
	}


	dropZone.addClass('hidden');
});


function pushSong(item,path) {
	path = path || "";
	if(item.isFile){
		item.file(function(file){
			if(file.type.match(/audio\/mp3/)){
				getID3Data(file, function (song) {
					allTracks.push(song);
					playlist.push(song);
					playTrack(playlist[playlist.length - 1]);
				});
			}
		});
	}
}

// Generate an object with all the needed information about a track.
function getID3Data(file, done) {

	getTags(file,function(result){

		result.audioTrack = file;
		result.playing = false;
		done(result);

	});
}

// Get ID3 data tags from file.
function getTags(file,done){

	var result = {};

	ID3.loadTags(file.name, function() {

		var tags = ID3.getAllTags(file.name);

		result.artist = tags.artist || "Unknown Artist";
		result.title = tags.title || "Unknown";
		result.album = tags.album || "";
		if(tags.picture && tags.picture.data && tags.picture.data.length) {
			result.picture = tags.picture;
			getImageSource(result.picture, function (imageSource) {
				result.picture = imageSource;
				done(result);
			});
		}
		else {
			result.picture = '/assets/images/default.png';
			done(result);
		}


	}, {
		tags: ["artist", "title", "album", "picture"],
		dataReader: FileAPIReader(file)
	});

}

function getImageSource(image, done) {
	var base64String = "";
	for (var j = 0; j < image.data.length; j++) {
		base64String += String.fromCharCode(image.data[j]);
	}
	done("data:" + image.format + ";base64," + window.btoa(base64String));
}


function readFile(file,done) {

	var reader = new FileReader();

	reader.onload = function(data){
		done(data);
	};

	reader.readAsDataURL(file);
}


/*-------------------
	Audio player.
 ------------------*/


var wavesurfer = Object.create(WaveSurfer);

wavesurfer.init({
	container: document.querySelector('#wave'),
	cursorColor: '#aaa',
	cursorWidth: 1,
	height: 80,
	waveColor: '#588efb',
	progressColor: '#f043a4'
});


// Read file and play it.
// Takes one parameter - the index of the track we want to play.
function playTrack(number){

	if(playlist[number] && playlist[i]) {

		lastPlayed.push(number);

		var file = playlist[i].audioTrack,
			result = {};


		readFile(file, function(result){
			result = file;
			wavesurfer.loadBlob(result);
		});

	}
	// If something went wrong stop playback.
	else{
		wavesurfer.stop();
	}

}


// An event handler for when a track is loaded and ready to play.
wavesurfer.on('ready', function () {

	// Play the track.
	wavesurfer.play();
	wavesurfer.setVolume(parseFloat($('#inputRegularVolume').val()) / 100);
	setTimeout(function() {
    	fadeVolumeDown();
    }, parseFloat($('#inputStartAt').val() * 1000));

	var duration = wavesurfer.getDuration();

	if(playlist[i]){
		document.title = playlist[i].artist + ' - ' + playlist[i].title;

		// Set cover art.

		$('#cover-art-view').attr('src', playlist[i].picture);

		// Show the artist and title.
		$('#track-desc').html('<b>' + playlist[i].title + '</b> by ' + playlist[i].artist);

		// Show duration of track.
		$('#current').text('0:00');
		$('#total').text(formatTime(duration));

		// Show the progress of the track in time.
		clearInterval(timer);
		timer = setInterval(function() {
			$('#current').text(formatTime(wavesurfer.getCurrentTime()));
		}, 1000);

		// In the playlist array mark the track as currently playing
		allTracks.forEach(function (tr) {
			tr.playing = false;
		});
		playlist[i].playing = true;


		$('.track').removeClass('active').eq(i).addClass('active');
	}

});

// Event handler when a track finishes playing
wavesurfer.on('finish', function () {
	// In case shuffle is on.
	if (shuffle){
		if (repeat == 2) {
			if (playlist[i]) {
				playTrack(i);
			}
		}
		else if (playlist.length > 1) {
			var temp = i;
			while (i == temp) {
				i = Math.floor(Math.random() * playlist.length);
			}
			if(playlist[i]) {
				playTrack(i);
			}
		}
	}
	// In case shuffle is off.
	else {
		if (!repeat) {
			if (i >= playlist.length - 1) {
				wavesurfer.stop();
			}
			else {
				i++;
				playTrack(i);
			}
		}
		else if (repeat == 1) {
			if (i >= playlist.length - 1) {
				i = 0;
			}
			else {
				i++;
			}
			playTrack(i);
		}
		else if (repeat == 2) {
			if (playlist[i]) {
				playTrack(i);
			}
		}
	}

});


wavesurfer.on('seek', function () {
	$('#current').text(formatTime(wavesurfer.getCurrentTime()));
});


/*---------------------
	Player controls
----------------------*/

// Pressing the 'next' button
// Plays next track in playlist, or if shuffle is on random track.
$('#next-button').on('click', function () {

	if (!shuffle) {
		i++;
		if (i > playlist.length - 1) {
			i = 0;
		}
	}
	else {
		if (playlist.length > 1) {
			var temp = i;
			while (i == temp) {
				i = Math.floor(Math.random() * playlist.length);
			}
		}
	}

	if(playlist[i]) {
		playTrack(i);
	}

});

// Pressing the 'previous' button.
// If shuffle is off plays previous song from playlist
// If shuffle is on takes song from lastPlayed to keep order.
$('#previous-button').on('click', function () {

	if(!shuffle){
		if(i==0){
			i=playlist.length-1;
		}
		else{
			i--;
		}
	}
	else{
		lastPlayed.pop();
		i = lastPlayed.pop();
	}

	if(i==undefined || i<0){
		i = 0;
	}

	playTrack(i);

});

var ease = function (currentTime, start, change, duration) {
    currentTime /= duration;
    return -change * currentTime * (currentTime-2) + start;
};

var fadeVolumeDown = function (startTime) {
      var currentTime = new Date();
      var elapsedTime;

      if (typeof startTime === "undefined") {
		elapsedTime = 0;
		startTime = new Date();
	  } else {
	  	elapsedTime = (currentTime.getTime() - startTime.getTime()) / 1000;
	  }

	  var regular = parseFloat($('#inputRegularVolume').val());
	  var delta = parseFloat($('#inputFadeDownVolume').val() - $('#inputRegularVolume').val());
      var currentVol = ease(elapsedTime, regular, delta, 1);
      if (currentVol + 0.01 > $('#inputRegularVolume').val()) {
      	currentVol = $('#inputRegularVolume').val();
      }
      if (currentVol - 0.01 < $('#inputFadeDownVolume').val()) {
		currentVol = $('#inputFadeDownVolume').val();
      }
      wavesurfer.setVolume( currentVol / 100 );
      
      if (elapsedTime < 1) {
        setTimeout(function() {
          fadeVolumeDown(startTime);
        }, null);
      } else {
        setTimeout(function() {
        	fadeVolumeUp();
        }, parseFloat($('#inputFadedDuration').val()) * 1000);
      }
};

var fadeVolumeUp = function (callback, startTime) {
      var currentTime = new Date();
      var elapsedTime;

      if (typeof startTime === "undefined") {
		elapsedTime = 0;
		startTime = new Date();
	  } else {
	  	elapsedTime = (currentTime.getTime() - startTime.getTime()) / 1000;
	  }

	  var regular = parseFloat($('#inputFadeDownVolume').val());
	  var delta = parseFloat($('#inputRegularVolume').val() - $('#inputFadeDownVolume').val());
      var currentVol = ease(elapsedTime, regular, delta, 1);
      if (currentVol + 0.01 > $('#inputRegularVolume').val()) {
      	currentVol = $('#inputRegularVolume').val();
      }
      if (currentVol - 0.01 < $('#inputFadeDownVolume').val()) {
		currentVol = $('#inputFadeDownVolume').val();
      }
      wavesurfer.setVolume( currentVol / 100 );
      
      if (elapsedTime < 1) {
        setTimeout(function() {
          fadeVolumeUp(null, startTime);
        }, null);
      } else {
		setTimeout(function() {
        	fadeVolumeDown();
        }, parseFloat($('#inputCycleDelay').val()) * 1000);
      }
};

$('#play-button').on('click', function(){
	wavesurfer.play();
	wavesurfer.setVolume(parseFloat($('#inputRegularVolume').val()) / 100);
	setTimeout(function() {
    	fadeVolumeDown();
    }, parseFloat($('#inputStartAt').val() * 1000));
});

$('#pause-button').on('click', function () {
	wavesurfer.playPause();
});

$('#stop-button').on('click', function(){
	wavesurfer.stop();
});

// Turn shuffle on and off.
$('#shuffle-button').on('click', function(){
	var that = $(this);

	if(that.hasClass('active')){
		that.removeClass('active');
		that.attr('title', 'Shuffle Off');
		shuffle = false;
	}
	else{
		that.addClass('active');
		that.attr('title', 'Shuffle On');
		shuffle = true;
	}
});

// repeat = 0 Repeat is off - when the playlist reaches it's end it will stop
// repeat = 1 Repeat all - when the playlist reaches it's end it will start from begining
// repeat = 2 Repeat Current - repeat track
$('#repeat-button').on('click', function(){

	var that = $(this);

	if(repeat==0){
		that.addClass('active');
		that.attr('title', 'Repeat All');
		repeat = 1;
	}

	else if(repeat==1){
		that.find('span').show();
		that.attr('title', 'Repeat Current');
		repeat = 2;
	}

	else if(repeat==2){
		that.find('span').hide();
		that.removeClass('active');
		that.attr('title', 'Repeat Off');
		repeat = 0;
	}

});


/*-------------------
 	Helper Functions
--------------------*/

//Automatically start playlist on file load.
function startPlayerWhenReady(){

	var interval = setInterval(function () {
		if(playlist[0]){
			playTrack(0);
			clearInterval(interval);
		}
	},200);
}


// Format time in minutes:seconds
function formatTime(time){
	time = Math.round(time);

	var minutes = Math.floor(time / 60),
		seconds = time - minutes * 60;

	seconds = seconds < 10 ? '0' + seconds : seconds;

	return minutes + ":" + seconds;
}


// Wavesurfer responsiveness
$(window).on('resize', function(){
	if($('#wave').is(":visible")) {
		wavesurfer.drawer.containerWidth = wavesurfer.drawer.container.clientWidth;
		wavesurfer.drawBuffer();
	}
});