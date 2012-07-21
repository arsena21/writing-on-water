/**
 * This file is a part of Writing on Water application.
 *
 * Copyright (c) 2012 Antonio R. <antonio@rain-d.ru>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Instrument template.
 * @constructor
 */
function Instrument () {
    this.valid = false;
    
    // Whenever the instrument is changed,
    // it's current state is saved here.
    this.state_brush = {
        valid: true,
        size:  32,
        color: 0xee0077
    };
    this.state_pencil = {
        valid: true,
        size:  1,
        color: 0x333333
    };
    
    // Change the template.
    this.template = function (name) {
        this.valid = false;
        
        switch (name) {
        case "brush":
            this.min_size   = 1;
            this.max_size   = 64;
            this.noise      = 0.0;
            this.resistance = 0.0;
            this.state      = this.state_brush;
            this.valid      = true;
            break;
        case "pencil":
            this.min_size   = 1;
            this.max_size   = 8;
            this.noise      = 1.0;
            this.resistance = 1.0;
            this.state      = this.state_pencil;
            this.valid      = true;
            break;
        };
    };
};

/**
 * Brush object.
 * FIMXE Store the list of used brush parameters.
 * @constructor
 */
function Brush (wgl, callwhenready) {
    var b = this;
    this.ready = false;
    this.water = 1.0;
    this.eraser = false;
    this.scale = new THREE.Vector3 (1.0, 1.0, 1.0);
    this.pointer_mesh = wgl.blob_mesh;
    this.snap_color = false;
    
    this.palette = new Palette ();
    this.palette.load ("json/pigments.json");

    // Brush base color (set by the picker)
    // and its current color.
    this.basecolor = new THREE.Color (0xee0077);
    this.color     = this.basecolor.clone ();
    this.pigment   = undefined;

    this.pointer_tex = THREE.ImageUtils.loadTexture ('tex/pointer.png', {}, function() {
        // Define the pointer material.
        b.pointer_matr = new THREE.MeshBasicMaterial ({
            color: 0xFFFFFF, map: b.pointer_tex,
            blending: THREE.NormalBlending,
            transparent: true
        });
        
        b.pointer_tex.magFilter = THREE.NearestMipMapNearestFilter ;
        b.pointer_tex.minFilter = THREE.LinearMipMapLinearFilter;

        // Pointer mesh.
        b.pointer_mesh = new THREE.Mesh (
            new THREE.PlaneGeometry (64, 64, 1, 1),
            b.pointer_matr
        );
        
        b.pointer_mesh.position = new THREE.Vector3 (0, 2, 0);
        b.check ();
    } );

    this.check = function () {
        if (b.pointer_mesh) {
            b.ready = true;
            callwhenready (b);
        }
    };
    
    this.isReady = function () {
        return b.ready;
    };
    
    this.waterReset = function (wetness) {
        if (wetness) {
            this.water = wetness;
        }
        this.color = this.basecolor.clone ();
    };
    
    /**
     * Called when the brush is applied.
     * Changes the amount of paint in the brush.
     */
    this.waterUpdate = function (w) {
        this.water = Math.min (Math.max (this.water + w, 0.0), 1.0);
    };
    
    /**
     * Called when the brush is applied.
     * Changes the color of paint in the brush.
     */
    this.colorUpdate = function (w, c) {
        this.color.r = this.color.r * (1.0 - w) + c.r * w;
        this.color.g = this.color.g * (1.0 - w) + c.g * w;
        this.color.b = this.color.b * (1.0 - w) + c.b * w;
    };
    
    this.changePosition = function (pos) {
        if (this.ready && this.pointer_mesh) {
            this.pointer_mesh.position = pos;
        }
    };
    
    /**
     * Called by color picker to initiate the color change.
     */
    this.changeColor = function (color) {
        this.pigment = undefined;
        
        var hex = color.substr (1, 6);
        var c = new THREE.Color ();
            c.setHex (parseInt (hex, 16));

        // Find the closest pigemnt.
        if (this.palette) {
            var p = this.palette.fromColor (c);
            if (p) {
                this.pigment = p;

                // Snap to pigment's color.
                if (this.snap_color) {
                    var hsv0 = THREE.ColorUtils.rgbToHsv (c);
                    var hsv1 = THREE.ColorUtils.rgbToHsv (p.color);

                    c.setHSV (hsv1.h, hsv0.s, hsv1.v);
                }
            }
        }
        
        this.basecolor = c;
        this.waterReset ();
    };
};

/**
 * Pigments database.
 * @constructor
 */
function Palette () {
    // List of know pigments.
    this.pigs = [];
    
    /**
     * Load the pigments list from a JSON file.
     */
    this.load = function (url) {
        var pal = this;
        jQuery.ajax ( {
            url: url,
            success: function (json) {
                jQuery.each (json.pigments, function (i, pig) {
                   var hex = pig.color.substr (2, 6);
                   pal.pigs.push ({
                        name:        pig.name,
                        code:        pig.code,
                        color:       new THREE.Color ().setHex (parseInt (hex, 16)),
                        colorstr:    "#" + hex,
                        granulation: pig.granulation,
                        opacity:     pig.opacity,
                        diffusion:   pig.diffusion,
                        blossom:     pig.blossom,
                        staining:    pig.staining
                   });
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                pal.pigs = [];
            },
            dataType: 'json'
        } );
    },
    
    this.hsvDistance = function (c0, c1) {
        var dx = c0.h - c1.h;
        var dy = c0.s - c1.s;
        var dz = c0.v - c1.v;
        return Math.sqrt (dx * dx + dy * dy + dz * dz);
    },
    
    /**
     * Find the closest pigment to a given color (hue and value).
     */
    this.fromColor = function (c) {
        var c0 = THREE.ColorUtils.rgbToHsv (c);
            c0.s = 0.0;
        var selected;
        var distance = Number.POSITIVE_INFINITY;
        for (var i = 0, len = this.pigs.length; i < len; i++) {
            var p  = this.pigs[i];
            var c1 = THREE.ColorUtils.rgbToHsv (p.color);
                c1.s = 0.0;
            var d  = this. hsvDistance (c0, c1);
            if (distance > d) {
                distance = d;
                selected = p;
            }
        }

        if (selected && distance < 0.5) {
            return selected;
        } else {
            return null;
        }
    };
};
