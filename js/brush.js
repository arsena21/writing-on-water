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

(function ($) {

    /**
     * Brush object.
     * FIXME Store the list of used brush parameters.
     * FIXME Nicer brush pointer needed.
     * FIXME Dynamic brush texture generation would be nice.
     * @constructor
     */
    window.Brush = function (wgl, callwhenready) {
        this.ready = false;
        this.water = 1.0;
        this.scale = new THREE.Vector3 (1.0, 1.0, 1.0);
        this.pointer_mesh = wgl.blob_mesh;
        this.snap_color = false;
        
        this.palette = new Palette ();
        this.palette.load ("json/pigments.json");
        
        // Brush base color (set by the picker)
        // and its current color.
        this.basecolor = new THREE.Color (0xee0077);
        this.color     = this.basecolor.clone ();
        this.pigment   = null;

        var b = this;
        var linear = function (x) {
            return 0.25 + 0.75 * x;
        };
    
        /**
         * Instrument template.
         * @constructor
         */
        this.template = {
            valid: false,

            // Whenever the instrument is changed,
            // its current state is saved here.
            state_brush: {
                valid:   true,
                size:    32,
                color:   0xee0077,
                opacity: 0.01
            },
            state_pencil: {
                valid:   true,
                size:    1,
                color:   0x333333,
                opacity: 0.5
            },
            state_eraser: {
                valid:   true,
                size:    16,
                color:   0xffffff,
                opacity: 0.5
            },
        
            // Change the template.
            set: function (name) {
                this.valid = false;
            
                switch (name) {
                case "brush":
                    this.min_size    = 1;
                    this.max_size    = 64;
                    this.noise       = 0.0;
                    this.resistance  = 0.0;
                    this.size_jitter = 0.0;
                    this.feedback    = 1.0;
                    this.skip        = 1;
                    this.force_color = undefined;
                    this.drymedia    = false;
                    this.state       = this.state_brush;
                    this.valid       = true;
                    this.dynamics    = {
                        /// Scale from pressure.
                        scale: function (value, pressure) {
                            return value.multiplyScalar (linear (pressure));
                        },
                        /// Opacity from pressure.
                        opacity: function (value, pressure) {
                            return value;
                        },
                        /// Dry-brush effect from water amount.
                        drybrush: function () {
                            var capacity = b.scale.x;
                            var amount   = Math.max (0.0, b.water - 1.0 + capacity);
                            return Math.max (0.0, (capacity - amount) / capacity);
                        },
                        /// Position jitter from pressure.
                        position_jitter: function (pressure) {
                            return 0.0;
                        }
                    };
                    break;
                case "pencil":
                    this.min_size    = 1;
                    this.max_size    = 8;
                    this.noise       = 1.0;
                    this.resistance  = 1.0;
                    this.size_jitter = 0.0;
                    this.feedback    = 0.0;
                    this.skip        = 1;
                    this.force_color = undefined;
                    this.drymedia    = true;
                    this.state       = this.state_pencil;
                    this.valid       = true;
                    this.dynamics    = {
                        /// Scale from pressure.
                        scale: function (value, pressure) {
                            return value;
                        },
                        /// Opacity from pressure.
                        opacity: function (value, pressure) {
                            return value * linear (pressure);
                        },
                        /// Dry-brush effect from water amount.
                        drybrush: function () {
                            return 0.0;
                        },
                        /// Position jitter from pressure.
                        position_jitter: function (pressure) {
                            return 0.0;
                        }
                    };
                    break;
                case "splatter":
                    this.min_size    = 8;
                    this.max_size    = 64;
                    this.noise       = 0.0;
                    this.resistance  = 0.0;
                    this.size_jitter = 0.2;
                    this.feedback    = 0.0;
                    this.skip        = 2;
                    this.force_color = undefined;
                    this.drymedia    = false;
                    this.state       = this.state_brush;
                    this.valid       = true;
                    this.dynamics    = {
                        /// Scale from pressure.
                        scale: function (value, pressure) {
                            return value.set (0.1, 0.1, 0.1);
                        },
                        /// Opacity from pressure.
                        opacity: function (value, pressure) {
                            return value;
                        },
                        /// Dry-brush effect from water amount.
                        drybrush: function () {
                            return 0.0;
                        },
                        /// Position jitter from pressure.
                        position_jitter: function (pressure) {
                            return 32.0 * b.scale.x * linear (pressure);
                        }
                    };
                    break;
                case "eraser":
                    this.min_size    = 8;
                    this.max_size    = 64;
                    this.noise       = 0.0;
                    this.resistance  = 1.0;
                    this.size_jitter = 0.0;
                    this.feedback    = 0.0;
                    this.skip        = 1;
                    this.force_color = new THREE.Color (0xffffff);
                    this.drymedia    = true;
                    this.state       = this.state_eraser;
                    this.valid       = true;
                    this.dynamics    = {
                        /// Scale from pressure.
                        scale: function (value, pressure) {
                            return value;
                        },
                        /// Opacity from pressure.
                        opacity: function (value, pressure) {
                            return linear (pressure);
                        },
                        /// Dry-brush effect from water amount.
                        drybrush: function () {
                            return 0.0;
                        },
                        /// Position jitter from pressure.
                        position_jitter: function (pressure) {
                            return 0.0;
                        }
                    };
                    break;
                };
            }
        };
        
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
        } );

        this.check = function () {
            if (this.pointer_mesh && this.palette.ready) {
                if (!this.ready) {
                    this.ready = true;
                    
                    callwhenready (this);
                }
            }
        };
    
        this.isReady = function () {
            this.check ();
            return this.ready;
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
        this.waterUpdate = function (dw) {
            if (this.template.valid) {
                dw *= this.template.feedback;
            }
            
            this.water = Math.min (Math.max (this.water + dw, 0.0), 1.0);
        };
        
        /**
         * Called when the brush is applied.
         * Changes the color of paint in the brush.
         */
        this.colorUpdate = function (dw, c) {
            if (this.template.valid) {
                dw *= this.template.feedback;
            }
            
            this.color.lerpSelf (c, dw);
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
            this.pigment = null;
            
            var hex = color.substr (1, 6);
            var c = new THREE.Color ();
                c.setHex (parseInt (hex, 16));
            
            // Find the closest pigemnt.
            if (this.palette) {
                var p = this.palette.fromColor (c);
                if (p && p.pigments.length) {
                    this.pigment = p.weighted;
                    
                    // Snap to pigment's color.
                    if (this.snap_color) {
                        var hsv0 = THREE.ColorUtils.rgbToHsv (c);
                        var hsv1 = THREE.ColorUtils.rgbToHsv (p.color);
                        
                        c.setHSV (hsv1.h, hsv0.s, hsv1.v);
                    }
                } else {
                    //alert ("ASSERT: palette::fromColor() == null.");
                }
            } else {
                alert ("ASSERT: this.palette == null.");
            }
            
            this.basecolor = c;
            this.waterReset ();
        };
    };

    /**
     * Color helper functions.
     * @constructor
     */
    function Pigment () {};

    /// Decompose a given color into the list of palette items.
    /// Assumes that pigment is defined by Hue and Value only
    /// and ignores Saturation.
    /// FIXME Unfinished.
    Pigment.decompose = function (c, palette, depth) {
        var c0 = THREE.ColorUtils.rgbToHsv (c);

        // Create a weighted average of all selected pigments.
        var w = {
            name:        "",
            code:        "",
            color:       new THREE.Color (0, 0, 0),
            hsv:         null,
            colorstr:    null,
            granulation: 0.0,
            opacity:     0.0,
            diffusion:   0.0,
            blossom:     0.0,
            staining:    0.0,
            reserved:    0
        };

        // 1. Calculate the distance for each color.
        var pigs = palette.slice ();
        for (var i = 0, len = pigs.length; i < len; i++) {
            var ci = pigs[i];
            if (!ci) 
                continue;

            var dh = c0.h - ci.hsv.h;
          //var ds = c0.s - c1.s; Saturation is ignored.
            var dv = c0.v - ci.hsv.v;

            pigs[i].reserved = Math.sqrt (dh * dh + dv * dv);
        }

        // 2. Sort the colors.
        pigs.sort (function (a, b) {
            return a.reserved - b.reserved;
        });

        var sum = 0.0;
        depth = 1;

        // 3. Compute the weights for K first colors.
        for (var i = 0; i < depth; i++) {
            var ci = pigs[i];
            var a  = (ci.hsv.h * c0.h + 
                    //ci.hsv.s * c0.s + 
                      ci.hsv.v * c0.v) /
                /*Math.sqrt*/
                    (ci.hsv.h * ci.hsv.h +
                     ci.hsv.v * ci.hsv.v);

            if (i) {
                w.name += "+";
                w.code += "+";
            }

            // Update the average.
            sum           += a;
            w.name        += ci.name;
            w.code        += ci.code;
            w.color.r     += a * ci.color.r;
            w.color.g     += a * ci.color.g;
            w.color.b     += a * ci.color.b;
            w.granulation += a * ci.granulation
            w.opacity     += a * ci.opacity;
            w.diffusion   += a * ci.diffusion;
            w.blossom     += a * ci.blossom;
            w.staining    += a * ci.staining;
        };

        // Normalize the average.
        //w.color.r     /= sum;
        //w.color.g     /= sum;
        //w.color.b     /= sum;
        w.granulation /= sum;
        w.opacity     /= sum;
        w.diffusion   /= sum;
        w.blossom     /= sum;
        w.staining    /= sum;

        w.hsv = THREE.ColorUtils.rgbToHsv (w.color);
        w.colorstr = "#" + w.color.getHex ().toString (16);

        // Truncate the list.
        if (pigs.length > depth) {
            pigs.length = depth;
        }

        return {
            pigments: pigs,
            weighted: w,
            color:    w.color
        };
    };
    
    /**
     * Pigments database.
     * @constructor
     */
    function Palette () {
        // List of known pigments.
        this.pigs = [];
        this.ready = false;
        
        /**
         * Load the pigments list from a JSON file.
         */
        this.load = function (url) {
            this.ready = false;
            
            var pal = this;
            jQuery.ajax ( {
                url: url,
                success: function (json) {
                    jQuery.each (json.pigments, function (i, pig) {
                        var hex = pig.color.substr (2, 6);
                        var color = new THREE.Color ().setHex (parseInt (hex, 16));
                        pal.pigs.push ({
                            name:        pig.name,
                            code:        pig.code,
                            color:       color,
                            hsv:         THREE.ColorUtils.rgbToHsv (color),
                            colorstr:    "#" + hex,
                            granulation: pig.granulation,
                            opacity:     pig.opacity,
                            diffusion:   pig.diffusion,
                            blossom:     pig.blossom,
                            staining:    pig.staining,
                            reserved:    0
                        });
                    });
                    
                    pal.ready = true;
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    pal.pigs = [];
                },
                dataType: 'json'
            } );
        },

        /**
         * Find the pigment mixture for a given color (hue and value).
         */
        this.fromColor = function (c) {
            return Pigment.decompose (c, this.pigs, 3);
        };
    };

}) (jQuery);
