
var lastImgUrl = '';

$( function() {
    //$( "input" ).checkboxradio();
    $( "input" ).dblclick(function() {
        $(this).parents('.controls').find('input').prop('checked', false);
        $(this).prop('checked', true);
        $(this).parents('.embedding').find('.plot-box canvas').each(function() {
            canvas_draw($(this));
        });
    });
    $( "input" ).click(function() {
        $(this).parents('.embedding').find('.plot-box canvas').each(function() {
            canvas_draw($(this));
        });
    });

    $('.embedding .btnAll').click(function(){
        $(this).parents('.embedding').find('.controls input[type=checkbox]').prop('checked', true);
        $(this).parents('.embedding').find('.plot-box canvas').each(function() {
            canvas_draw($(this));
        });
    });
    $('.embedding .btnNone').click(function(){
        $(this).parents('.embedding').find('.controls input[type=checkbox]').prop('checked', false);
        $(this).parents('.embedding').find('.plot-box canvas').each(function() {
            canvas_draw($(this));
        });
    });
    
    $('.plot-box canvas').each(function() {
        canvas_init($(this));
    });

    $('.embedding').each(function(embeddingIndex) {
        var emb = $(this);
        var cs = emb.find('.plot-box canvas');
        cs.mousemove(function(e) {
            var parentOffset = $(this).offset(); 
            var relX = e.pageX - parentOffset.left;
            var relY = e.pageY - parentOffset.top;
            var coords = [relX, relY];
            //console.log(coords);
            
            let dsIndex = 0;
            var data = plotData[embeddingIndex][dsIndex];
            var minDistance = 1e20;
            var bestURL = '';
            var bestDataPoint = undefined;
            var bestDataIndex = -1;
            
            var cbs = emb.find('.controls input');
            for (var layer = 0; layer < data.length; layer++) {
                if (!cbs[layer].checked) {
                    continue;
                }
                for (var i = 0; i < data[layer]['pxCoords'].length; i++) {
                    dataPoint = data[layer]['pxCoords'][i];
                    dist = norm2(coords, dataPoint)
                    if (dist <= minDistance) {
                        minDistance = dist;
                        bestURL = data[layer]['url'][i];
                        bestDataPoint = dataPoint;
                        bestDataIndex = data[layer]['indices'][i];
                    }
                }
            }
            minDistance = Math.sqrt(minDistance);
            
            var selectDataPoint = bestDataPoint;
            if (minDistance > 25) {
                //console.log('Too far...' + minDistance);
                emb.find('.img-preview .desc').html('<i>No sample</i>');
                emb.find('.img-preview img').attr('src', './scripts/no_img.png');
                selectDataPoint = undefined;
            } else {
                var imgUrl = baseImgUrl + '/' + bestURL;        
                emb.find('.img-preview .desc').html(imgUrl);
                emb.find('.img-preview img').attr('src', imgUrl);

                lastImgUrl = imgUrl;
            }

            // redraw graph
            emb.find('.plot-box canvas').each(function() {
                canvas_draw($(this), coords, selectDataPoint);
            });


            // redraw glove
            if (selectDataPoint === undefined) {
                gloveMap.setData(undefined);
            } else {
                let data = sensorData[sensorDataIndex[bestDataIndex]];
                gloveMap.setData(data);

            }            
        });

    });


    // Glove
    gloveMap_init();
} );

function canvas_init(canvas) {
    var img0 = getLayers(canvas)[0]
    var w = img0.width;
    var h = img0.height;
    canvas[0].width = w;
    canvas[0].height = h;
    canvas[0].style.width = "" + w + "px";
    canvas[0].style.height = "" + h + "px";
    canvas_draw(canvas);
    canvas.parents('.plot-box').width("" + w + "px")
}

function getLayers(canvas) {
    return canvas.parent().find('.layers .layer')
}

function canvas_draw(canvas, coords, dataPoint) {
    if (coords === undefined) {
        coords = [-1, -1];
    }
    var ctx = canvas[0].getContext('2d');

    // clear bg
    ctx.fillStyle="#FFFFFF";
    ctx.fillRect(0, 0, canvas.width(), canvas.height());

    // axes
    var axes = canvas.parent().find('.axes img')[0]
    ctx.drawImage(axes, 0, 0);
    
    // layers
    var cbs = canvas.parents('.embedding').find('.controls input');
    var layers = getLayers(canvas)
    for (var i = 0; i < layers.length; i++) {
        if (!cbs[i].checked) {
            continue;
        }
        ctx.drawImage(layers[i], 0, 0);
    }

    // data point
    if (dataPoint !== undefined) {
        ctx.strokeStyle = "#bb0000";
        ctx.lineWidth = 2;

        // horizontal
        ctx.beginPath(); 
        ctx.arc(dataPoint[0], dataPoint[1], 5, 0, 2*Math.PI);
        ctx.stroke();
    }

    // cross
    if (coords[0] >= 0 && coords[1] >= 0) {
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;

        // horizontal
        ctx.beginPath(); 
        ctx.moveTo(0.5, coords[1] + 0.5);
        ctx.lineTo(canvas.width() + 0.5, coords[1] + 0.5);
        ctx.stroke();
        // vertical
        ctx.beginPath(); 
        ctx.moveTo(coords[0] + 0.5, 0.5);
        ctx.lineTo(coords[0] + 0.5, canvas.height() + 0.5);
        ctx.stroke();
    }
}

function norm2(a, b) {
    dx = a[0] - b[0];
    dy = a[1] - b[1];
    return (dx * dx + dy * dy)
}





/*
Glove map
*/

var gloveMap;

function gloveMap_init() {

    var cmap = window['bone'];
	var cmapMod = [];
	for (var i = 0; i < cmap.length; i++) {
		let x = cmap[cmap.length - 1 - i];
		var alpha = 1.0 - x[0];
        //alpha = Math.log(alpha + 1) / Math.log(2);
		//alpha = Math.pow(alpha, 2.0);
		alpha = Math.pow(2.0, alpha) - 1.0;
		let y = [alpha, [x[1][0], x[1][1], x[1][2]]];
		
		//if (y[0] < 0.5) {
		//	continue;
		//}
		//y[0] = 2 * (y[0] - 0.5);
		
		cmapMod.push(y);
	}	

    let props = {
        'cmap': cmapMod
    }

    // colorbar
	colorbar_init(props['cmap']);
		
    // glove map
    $('.glove-map canvas').each(function() {
        gloveMap = new GloveMap($(this), props);
    });    

}


/* 
Colorbar
*/
/* 
Colorbar
*/
function colorbar_init(cmap) {	
    var canvas = $('<canvas class="colorbar" width="20" height="300"></canvas>');
    canvas.width(20);
    canvas.height(300);
	$('.legend').append(canvas);
	
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
    let isFullMode = true;
    if (isFullMode){
        ctx.fillStyle = '#ffffff';
    } else {
        ctx.fillStyle = '#000000';
    }
    ctx.font=""+20+"px Arial";
    let label = 'Relative pressure';
    let textW = ctx.measureText(label).width;
    //ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(w / 2 + 7, h / 2 + textW / 2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "middle";
    ctx.fillText(label, 0, 0);
    ctx.restore();
}



class GloveMap {
    constructor(canvas, props, dataDefault, dataSelect) {
        this.canvas = canvas;
        this.dataDefault = dataDefault;
        this.dataSelect = dataSelect;
        this.props = props;
        
        if (!this.props.hasOwnProperty('cmap')) {
            this.props['cmap'] = window['bone'];
        }
        if (!this.props.hasOwnProperty('cmap_select')) {
            this.props['cmap_select'] = this.props['cmap'];
        }

        this.selectedIndex = -1;

        this.initCanvas();
        this.initEvents();
        this.update();
    }
    
    initCanvas() {
        var w = this.canvas[0].width;
        var h = this.canvas[0].height;
        this.canvas[0].style.width = "" + w + "px";
        this.canvas[0].style.height = "" + h + "px";
    }
    
    initEvents() {
        let that = this;
        this.canvas.mousemove(function(e) {
            var parentOffset = $(this).offset(); 
            var relX = e.pageX - parentOffset.left;
            var relY = e.pageY - parentOffset.top;
            var coords = [relX, relY];
            //console.log(coords);
            
            e.preventDefault();
            e.stopPropagation();
            that.selectByMouseCoords(coords);
        
        });
        
        // http://xn--dahlstrm-t4a.net/svg/libraries/svgkit/example/canvas-to-svg.html
        var svgContainer = $('<div id="svg-container"></div>');
        $('body').append(svgContainer);
        var imgContainer = $('<div id="img-container"></div>');
        $('body').append(imgContainer);
    
        this.canvas.parent().keydown(function(e) {
            let key = e.key;
            if (key != 's') {
                return;
            }
            
            that.exportSVG();
            var img = $('<img />');
            img.attr('src', lastImgUrl.replace('/viz/', '/'));
            imgContainer.html(img);
            img = $('<img />');
            img.attr('src', lastImgUrl);
            imgContainer.append(img);
            
        });
        
        // null    
        $('body').mousemove(function(e) {
            that.setSelectedIndex(-1);
        });
        
    }

    exportSVG() {
        let sz = [800, 800];
        var svgkitContext = new SVGCanvas(sz[0],sz[1]);
        // draw to SVGKit canvas (svg)
        this.render(svgkitContext, sz[0], sz[1])
        var svg = $(svgkitContext.svg.svgElement);
        //svg.width(200);
        //svg.height(200);
        var svgContainer = $("#svg-container");
        svgContainer.html(svg);
        
        //get svg source.
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(svg[0]);
    
        //add name spaces.
        if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
    
        //add xml declaration
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    
        //convert svg source to URI data scheme.
        var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
    
        var hiddenElement = document.createElement('a');
        hiddenElement.href = url;
        hiddenElement.target = '_blank';
        hiddenElement.download = 'glove.svg';
        hiddenElement.click();
    }

    setData(data) {
        this.dataDefault = data;
        this.update();
    }

    setDataSelect(data) {
        this.dataSelect = data;
        this.update();
    }

    setSelectedIndex(selectedIndex) {
        this.selectedIndex = selectedIndex;
        this.update();
    }

    selectByMouseCoords(coords) {
        var w = this.canvas[0].width;
        var h = this.canvas[0].height;
        
        // mouse select
        var selectedIndex = -1;
        if (coords[0] >= 0 && coords[1] >= 0) {
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

        this.setSelectedIndex(selectedIndex)
    }
    
    update(coords) {            
        let w = this.canvas.width();
        let h = this.canvas.height();
        let ctx = this.canvas[0].getContext('2d');
        
        // clear bg
        ctx.fillStyle="#FFFFFF";
        ctx.fillRect(0, 0, w, h);

        this.render(ctx, w, h);
    }
    
    
    render(ctx, w, h) {
                        
        // data source
        var sensorData = this.dataDefault;
        var cmap = this.props['cmap'];
    
        if (this.selectedIndex >= 0 && this.dataSelect !== undefined) {
            sensorData = this.dataSelect[this.selectedIndex];
            cmap = this.props['cmap_select'];
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

        // no data
        if (this.dataDefault === undefined) {
            return;
        }
        
        let radius = Math.min(w, h) * 0.01;
        for (var i = 0; i < sensorLayout.length; i++) {
            var pt = [sensorLayout[i][0] * w, (1 - sensorLayout[i][1]) * h];
            
            // value
            var value = sensorData[i]
            var color = interpolateLinearly(value, cmap);
            let r = Math.round(255*color[0]);
            let g = Math.round(255*color[1]);
            let b = Math.round(255*color[2]);
            ctx.fillStyle = 'rgb('+r+', '+g+', '+b+')';
    
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1;
    
            ctx.beginPath(); 
            ctx.arc(pt[0], pt[1], radius, 0, 2*Math.PI);
            ctx.fill();
            //ctx.stroke();
    
            //ctx.beginPath(); 
            //ctx.arc(pt[0], pt[1], radius, 0, 2*Math.PI);
        }    
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