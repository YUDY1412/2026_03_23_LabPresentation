var activeGloveId = 0;
var isFullMode = false;

$( function() {

    isFullMode = sensorCovariance[0][0].length > 500;
	
	var extraBox = $('<div id="extraBox"></div>');
	$('#gloves').after(extraBox);
	extraBox.after('<hr class="clr"></hr>');
	
	// create color map
	//let cmap = window['RdGy'];
	let cmap = window['bone'];
	//let cmap = window['Greys'];
	var cmapR = [];
	for (var i = 0; i < cmap.length; i++) {
		let x = cmap[cmap.length - 1 - i];
        var alpha = 1.0 - x[0];
        
        if (isFullMode)
            // the full glove => small correlations => needs optimized color scheme
            alpha = Math.pow(2.0, alpha) - 1.0;
        else
            alpha = Math.pow(alpha, 0.2);
            
		let y = [alpha, [x[1][0], x[1][1], x[1][2]]];
		
		cmapR.push(y);
    }	
    


	window['cmapCorr'] = cmapR;
	
	// colorbar
	colorbar_init(window['cmapCorr']);
	
	
    // glove map
    $('.glove-map canvas').each(function() {
        gloveMap_init($(this));
    });    

    $('.glove-map canvas').mousemove(function(e) {
        var parentOffset = $(this).offset(); 
        var relX = e.pageX - parentOffset.left;
        var relY = e.pageY - parentOffset.top;
        var coords = [relX, relY];
        //console.log(coords);
        
        activeGloveId = $(this).parents('.glove').attr('data-glove-id');
        gloveMap_update($(this), coords);
        e.preventDefault();
        e.stopPropagation();

    });
	
    // null    
    $('.glove-map canvas').mouseleave(function(e) {
        gloveMap_update($(this));
    });
	

} );

/* 
Colorbar
*/
function colorbar_init(cmap) {	
	var canvas = $('<canvas class="colorbar" width="20" height="500"></canvas>');
	$('#extraBox').append(canvas);
	
	var w = canvas.width();
    var h = canvas.height();
    canvas[0].width = w;
    canvas[0].height = h;
    canvas[0].style.width = "" + w + "px";
    canvas[0].style.height = "" + h + "px";
	
	var ctx = canvas[0].getContext('2d');
	ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
	
	for (var i = 0; i < h; i++) {
		var value = 1-(i / (h - 1));
		//value = Math.log(value + 1) / Math.log(2.0);
		var color = interpolateLinearly(value, cmap);
		var r = Math.round(255*color[0]);
		var g = Math.round(255*color[1]);
		var b = Math.round(255*color[2]);
		ctx.strokeStyle = 'rgb('+r+', '+g+', '+b+')';		
		
		ctx.beginPath(); 
		ctx.moveTo(0.5, i + 0.5);
		ctx.lineTo(w + 0.5, i + 0.5);
		ctx.stroke();
    }
    
    // border
    ctx.strokeStyle = '#bbbbbb';
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // labels
    ctx.font=""+28+"px Arial";
    ctx.fillStyle = '#000000';
    ctx.fillText('0', 2, h-5);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('1', 2, 29);


    ctx.save();
    if (isFullMode){
        ctx.fillStyle = '#ffffff';
    } else {
        ctx.fillStyle = '#000000';
    }
    ctx.font=""+20+"px Arial";
    let label = 'Correlation coefficient';
    let textW = ctx.measureText(label).width;
    //ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(w / 2 + 7, h / 2 + textW / 2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "middle";
    ctx.fillText(label, 0, 0);
    ctx.restore();
}



/*
Glove map
*/

function gloveMap_init(canvas) {
    var w = canvas.width();
    var h = canvas.height();
    canvas[0].width = w;
    canvas[0].height = h;
    canvas[0].style.width = "" + w + "px";
    canvas[0].style.height = "" + h + "px";
    gloveMap_update(canvas);
    //canvas.parents('.plot-box').width("" + w + "px")

    //$('body').append('<span id="log"></span>');
}

function gloveMap_update(canvas, coords, selectedIndex, source) {
    if (coords === undefined) {
        coords = [-1, -1];
    }
    if (selectedIndex === undefined) {
        selectedIndex = -1;
    }
    if (source === undefined) {
        source = 'user';
    }

	var ctx = canvas[0].getContext('2d');
	var w = canvas[0].width;
    var h = canvas[0].height;
	
	// mouse select
    if (selectedIndex < 0 && coords[0] >= 0 && coords[1] >= 0) {
        var minDistance = 1e20;
        for (var i = 0; i < sensorLayout.length; i++) {
            var pt = [sensorLayout[i][0] * w, (1 - sensorLayout[i][1]) * h];
            var dist = norm2(coords, pt);
            if (dist <= minDistance) {
                minDistance = dist;
                selectedIndex = i;
            }
        }
        minDistance = Math.sqrt(minDistance);
        if (minDistance > 25) {
            selectedIndex = -1;
        }
    }
	
	canvas[0].selectedIndex = selectedIndex;
	
	// clear bg
    ctx.fillStyle="#FFFFFF";
    ctx.fillRect(0, 0, canvas.width(), canvas.height());
	
    //selectedIndex = gloveMap_render_simple(canvas, coords, selectedIndex);
    gloveMap_render_fancy(canvas, ctx, w, h, selectedIndex);
	
	
    
    // propagate
    if (source == 'user') {
        // $('.glove-map canvas').not(canvas).each(function() {
        //     gloveMap_update($(this), coords, undefined, 'glove-map');
        // });
        canvas.parents('.glove').find('.embedding canvas').each(function() {
            embedding_update($(this), undefined, selectedIndex, 'glove-map');
        });
    }
}

function gloveMap_render_fancy(canvas, ctx, w, h, selectedIndex) {
        
        
    // use means
    var gloveId = canvas.parents('.glove').attr('data-glove-id');
    var sensorData = undefined;
    var cmap = window['cmapCorr']
    
    if (selectedIndex >= 0) {
        // use correlation
        let covIndexA = regionIds[selectedIndex];
        sensorData = sensorCovariance[activeGloveId][gloveId][covIndexA];
    }


    // draw shape
    ctx.strokeStyle = "#888888";
    ctx.beginPath(); 
    for (var i = 0; i < gloveShape.length; i++) {
        var pt = [gloveShape[i][0] * w, (1 - gloveShape[i][1]) * h];
        if (i == 0) {
            ctx.moveTo(pt[0], pt[1]);
        } else {
            ctx.lineTo(pt[0], pt[1]);
        }
    }
    ctx.stroke();
    
    let radius = Math.min(w, h) * 0.01;
    for (var i = 0; i < sensorLayout.length; i++) {
        var pt = [sensorLayout[i][0] * w, (1 - sensorLayout[i][1]) * h];
        
        // value
        var color = [244/255.0, 248/255.0, 248/255.0];
        if (selectedIndex >= 0) {
            let covIndexB = regionIds[i];
            var value = sensorData[covIndexB]
            color = interpolateLinearly(value, cmap);
        }
        r = Math.round(255*color[0]);
        g = Math.round(255*color[1]);
        b = Math.round(255*color[2]);
        ctx.fillStyle = 'rgb('+r+', '+g+', '+b+')';

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;

        ctx.beginPath(); 
        ctx.arc(pt[0], pt[1], radius, 0, 2*Math.PI);
        ctx.fill();
		//ctx.stroke();
        
    }

    if (selectedIndex < 0) { 
        let msg = 'Hover mouse';
        ctx.font=""+30+"px Arial";
        ctx.fillStyle = '#888888';
        tW = ctx.measureText(msg).width;
        ctx.fillText(msg, w * 0.33 - tW / 2, h  * 0.7);
    }
    
    
}




/*
Utils
*/



function interpolateLinearly(x, values) {

    // Split values into four lists
    var x_values = [];
    var r_values = [];
    var g_values = [];
    var b_values = [];
    for (i in values) {
        x_values.push(values[i][0]);
        r_values.push(values[i][1][0]);
        g_values.push(values[i][1][1]);
        b_values.push(values[i][1][2]);
    }

    var i = 1;
    while (x_values[i] < x) {
        i = i+1;
    }
    i = i-1;

    var width = Math.abs(x_values[i] - x_values[i+1]);
    var scaling_factor = (x - x_values[i]) / width;

    // Get the new color values though interpolation
    var r = r_values[i] + scaling_factor * (r_values[i+1] - r_values[i])
    var g = g_values[i] + scaling_factor * (g_values[i+1] - g_values[i])
    var b = b_values[i] + scaling_factor * (b_values[i+1] - b_values[i])

    return [enforceBounds(r), enforceBounds(g), enforceBounds(b)];

}

function enforceBounds(x) {
    if (x < 0) {
        return 0;
    } else if (x > 1){
        return 1;
    } else {
        return x;
    }
}

function norm2(a, b) {
    dx = a[0] - b[0];
    dy = a[1] - b[1];
    return (dx * dx + dy * dy)
}