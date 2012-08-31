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
    window.Brush = function (utils, wgl, callwhenready) {
        this.ready = false;
        this.water = 1.0;
        this.scale = new THREE.Vector3 (1.0, 1.0, 1.0);
        this.pointer_mesh = wgl.blob_mesh;
        this.snap_color   = false;
        
        this.palette = new Palette ();
        this.palette.load ("json/pigments.json");
        
        // Brush base color (set by the picker)
        // and its current color.
        this.basecolor = new THREE.Color (0xee0077);
        this.color     = this.basecolor.clone ();
        this.pigment   = null;
        this.physics   = new BrushPhysics (utils);

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
                color:   0xee0077
            },
            state_pencil: {
                valid:   true,
                size:    1,
                color:   0x333333
            },
            state_eraser: {
                valid:   true,
                size:    16,
                color:   0xffffff
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
                    this.opacity     = 0.0;
                    this.skip        = 1;
                    this.force_color = undefined;
                    this.bristles    = true;
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
                            var capacity = Math.max (0.4, b.scale.x);
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
                    this.opacity     = 0.5;
                    this.skip        = 1;
                    this.force_color = undefined;
                    this.bristles    = false;
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
                    this.opacity     = 0.0;
                    this.skip        = 2;
                    this.force_color = undefined;
                    this.bristles    = false;
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
                    this.opacity     = 0.5;
                    this.skip        = 1;
                    this.force_color = new THREE.Color (0xffffff);
                    this.bristles    = false;
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
        
            b.pointer_tex.generateMipmaps = true;
            b.pointer_tex.magFilter = THREE.NearestMipMapNearestFilter;
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
        
        this.reset = function (wetness) {
            if (wetness) {
                this.water = wetness;
            }
            this.color = this.basecolor.clone ();
            
            if (this.physics) {
                this.physics.reset ();
            }
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
            this.physics.wetness (this.water);
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
        
        this.changePressure = function (p) {
            //this.physics.pressure (p);
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
            this.reset ();
        };
        
        /// Rebuild the brush shape.
        this.updateShape = function (renderer) {
            if (this.physics && renderer) {
                this.physics.updateShape (renderer);
                this.blob_texture = this.physics.shape;
            }
        };
    };
    
    /**
     * Brush pointer generator.
     * @constructor
     */
    function BrushPhysics (utils) {
        var resolution  = 64;
        var refreshRate = 100; // ms
        
        this.size  = 128;
        this.mesh  = [];
        this.invalidated = false;
        this.lastUpdate = new Date ().getTime ();
        
        // Bristle blobs.
        for (var i = 0; i < resolution; i++) {
            var p = {
                position: new THREE.Vector3 (),
                scale:    new THREE.Vector3 ()
            };
            
            this.mesh.push (p);
        }
        
        /// Mark the model as invalidated
        /// regarding the update rate.
        this.invalidate = function (force) {
            var time = new Date ().getTime ();
            if (time - this.lastUpdate > refreshRate || force) {
                this.lastUpdate = time;
                this.invalidated = true;
                return true;
            } else
                return false;
        };
        
        /// Change the brush wetness.
        this.wetness = function (w) {
            if (this.invalidate (false)) {
                var s = w * 8.0 / resolution;
                for (var i = 0, len = this.mesh.length; i < len; i++) {
                   this.mesh[i].scale.set (s, s, s);
                }
            }
        };
        
        /// Generate a random value with normal distribution.
        this.gaussian = function (dev) {
            if (this.nextGaussian) {
                var s = this.nextGaussian;
                this.nextGaussian = undefined;
                return dev * s;
            } else {
                var v1, v2, s;
                do { 
                    v1 = 2 * Math.random () - 1;   // between -1.0 and 1.0
                    v2 = 2 * Math.random () - 1;   // between -1.0 and 1.0
                    s = v1 * v1 + v2 * v2;
                } while (s >= 1 || s == 0);
                
                var multiplier = Math.sqrt (-2 * Math.log (s) / s);
                this.nextGaussian = v2 * multiplier;
                return dev * v1 * multiplier;
            }
        };
        
        /// Randomize the bristle blobs' positions.
        this.reset = function () {
            this.invalidate (true);
            
            for (var i = 0, len = this.mesh.length; i < len; i++) {
                this.mesh[i].position.set (
                    Math.max (Math.min (64.0, this.gaussian (32.0)), -64.0),
                    0.0,
                    Math.max (Math.min (64.0, this.gaussian (32.0)), -64.0)
                );
            }
        };
        
        this.reset ();
        this.wetness (1.0);
    };

    /**
     * Color helper functions.
     * @constructor
     */
    function Pigment () {};

    /// Returns the closest palette item to a given color.
    /// Assumes that pigment is defined by Hue and Value only
    /// and ignores Saturation.
    Pigment.closest = function (c, palette) {
        var d = 10000.0;
        var p = null;

        for (var j = 0; j < palette.length; j++) {
            var ci = palette[j];
            var v1 = new THREE.Vector3 (ci.hsv.h, 1.0, ci.hsv.v);
            var d1 = v0.distanceTo (v1);

            // Choose the closest.
            if (d > d1) {
                d = d1;
                p = ci;
            }
        }

        if (!p)
            return undefined;
    };
    
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

        var sum = 0.0;
        var a = 1.0;
        var pigs = [];
        depth = 1;

        // Decompose.
        for (var i = 0; i < depth; i++) {
            var v0 = new THREE.Vector3 (c0.h, 1.0, c0.v);
            var d = 10000.0;
            var p = null;

            for (var j = 0; j < palette.length; j++) {
                var ci = palette[j];
                var v1 = new THREE.Vector3 (ci.hsv.h, 1.0, ci.hsv.v);

                //var dot = v0.clone().normalize().dot (v1.clone().normalize()); // Dot product.
                var d1 = v0.distanceTo (v1);

                // Choose the closest.
                if (d > d1) {
                    d = d1;
                    p = ci;
                }
            }

            if (!p)
                break;

            if (i) {
                w.name += "+";
                w.code += "+";
            }

            //var v1 = new THREE.Vector3 (p.hsv.h, p.hsv.s, p.hsv.v);
            //a = v0.length () / v1.length ();

            // Update the average.
            sum           += a;
            w.name        += p.name;
            w.code        += p.code;
            w.color.r     += a * p.color.r;
            w.color.g     += a * p.color.g;
            w.color.b     += a * p.color.b;
            w.granulation += a * p.granulation
            w.opacity     += a * p.opacity;
            w.diffusion   += a * p.diffusion;
            w.blossom     += a * p.blossom;
            w.staining    += a * p.staining;
            
            pigs.push (p);
            
            // Subtract the color.
            //v0.subSelf (v1);
            
            //v0.x = Math.max (0.0, v0.x);
            //v0.y = Math.max (0.0, v0.y);
            //v0.z = Math.max (0.0, v0.z);
            
            //a = v.length ();
            //v.multiplyScalar (1.0 / a);

            c0.h = v0.x;
            c0.s = v0.y;
            c0.v = v0.z;
        };

        // Normalize the average.
        if (sum > 0.001) {
            //w.color.r     /= sum;
            //w.color.g     /= sum;
            //w.color.b     /= sum;
            w.granulation /= sum;
            w.opacity     /= sum;
            w.diffusion   /= sum;
            w.blossom     /= sum;
            w.staining    /= sum;
        }

        //w.color.r = Math.max (0.0, v.x);
        //w.color.g = Math.max (0.0, v.y);
        //w.color.b = Math.max (0.0, v.z);
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
