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
      * Script loading helper.
      * @constructor
      */
    window.MyLoader = function (url, name, status, callback) {
        this.url = url;
        this.name = name;
        this.status = status;
        this.callback = callback;

        var l = this;
        $.ajax ( {
            url: url,
            success: function (data) {
                l.callback[l.name] = data;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (l.status) {
                    l.status.set (errorThrown, false);
                }
            },
            dataType: 'text'
        } );
    };

    /**
     * Show the alert box with a given message.
     */
    window.alertBox = function (selector, msg) {
        var div = $("#" + selector + "box");
        $("#" + selector + "_text").html (msg);
        if (!div.is(':visible')) {
            div.show (200);
            div.oneTime ("5s", function() {
                $(this).hide (200);
            });
        }
    }

    /**
     * Slider with the label and "auto" button.
     */
    var AdvancedSlider = Backbone.View.extend ({
        tagName: "div",

        initialize: function () {
            _.bindAll (this, 'render');

            this.name      = this.options.name    ? this.options.name    : "fancyslider";
            this.title     = this.options.title   ? this.options.title   : "Fancy Slider";
            this.measure   = this.options.measure ? this.options.measure : "%";
            this.def_value = this.options.value   ? this.options.value   : 0;
            this.min_value = this.options.min     ? this.options.min     : 0;
            this.max_value = this.options.max     ? this.options.max     : 100;
            this.auto      = this.options.auto    ? this.options.auto    : false;
            this.hide_auto = this.options.hide_auto_button;
            this.target    = this.options.target;
            this.filter    = this.options.value_filter ? this.options.value_filter : function (x) {return x;};
            this.render ();
        },

        /// Render the element.
        render: function () {
            var selector0 = "#" + this.name + "_auto";
            var selector1 = "#" + this.name + "_slider";
            var selector2 = "#" + this.name + "_back";

            // Load the template.
            var me = this;
            var ctel = $("#fancyslider_template");
            var vars = {
                selector0: this.name + "_auto",
                selector1: this.name + "_slider",
                selector2: this.name + "_back",
                title:     me.title,
                measure:   me.measure,
                def_value: me.def_value,
                hide_auto: me.hide_auto,
                auto:      me.auto
            };
            var ss = ctel.html();
            var template = _.template (ctel.html(), vars);
            $(this.el).html (template);

            // Add an 'auto' button with callback.
            if (!this.hide_auto) {
                this.$("#" + selector0).button ().click (function () {
                    me.auto = Boolean (me.$("#" + selector0 + ":checked").val ());
                    if (me.target) {
                        me.target.auto = me.auto;
                    }
                });
            }
            // Add the slider element with callback.
            this.$("#" + selector1).slider ({
                range: "min",
                min:   me.min_value,
                max:   me.max_value,
                value: me.def_value,
                slide: function (e, ui) {
                    me.$("#" + selector2).html (me.title + ": " + ui.value + me.measure);
                    var v = me.filter (ui.value / me.max_value);
                    if (me.target) {
                        me.target.value = v;
                    }
                }
            });

            // Set the initial values.
            var v = this.filter (this.def_value / this.max_value);
            if (this.target) {
                this.target.auto  = this.auto;
                this.target.value = v;
            }
        },

        /// Change the slider's value and update the target if any.
        set: function (value) {
            this.$("#" + this.name + "_slider").slider ("value", value);
            this.$("#" + this.name + "_back").html (this.title + ": " + value + this.measure);
            var v = this.filter (value / this.max_value);
            if (this.target) {
                this.target.value = v;
            }
        },

        /// Get the slider's value.
        get: function () {
            return this.$("#" + this.name + "_slider").slider ("value");
        },

        /// Change the slider's value range.
        range: function (min, max) {
            var s  = this.$("#" + this.name + "_slider");
            var v0 = s.slider ("value");
            var v1;

            s.slider ("option", "min", min);
            s.slider ("option", "max", max);
            // Clamp the value.
            if (v0 < min) {
                v1 = min;
                s.slider ("value", min);
            }
            if (v0 > max) {
                v1 = max;
                s.slider ("value", max);
            }

            if (v1) {
                v1 = this.filter (v1 / this.max_value);
                if (this.target) {
                    this.target.value = v1;
                }
            }
        }
    });

    /**
     * Controls pane.
     */
    window.ControlsView = Backbone.View.extend ({
        el : $('#controls'),
        events: {
            'click input#debug':       'toggleDebug',
            'click input#gravity':     'toggleGravity',
            'click button#save':       'saveCanvas',
            'click button#commit':     'commitCanvas',
            'click button#clear':      'clearCanvas',
            'click input#autocommit':  'toggleAutocommit',
            'change input#committime': 'toggleAutocommit'
        },

        initialize: function () {
            _.bindAll (this, 'render', 'toggleDebug', 'toggleGravity',
                       'saveCanvas', 'toggleAutocommit', 'commitCanvas',
                       'clearCanvas', 'updateSliders');

            var canvas = this.canvas = this.options.canvas;
            this.def_values = {
                brush_sz: 32,
                brush_wet: 90,
                opacity: 1,
                granulation: 50,
                noise: 0,
                auto_commit: 2,
                max_particles: 2000
            };

            // Create some sliders.
            this.sliders = {
                brushsz: new AdvancedSlider ({
                    name:    "brushsz",
                    title:   "Brush size",
                    measure: "px",
                    value:   this.def_values.brush_sz,
                    min: 1,
                    max: 64,
                    hide_auto_button: true,
                    value_filter: function (value) {
                        if (canvas) {
                            canvas.setBrushScale (2.0 * value);
                        }

                        return value;
                    }
                }),
                wetness: new AdvancedSlider ({
                    name:  "wetness",
                    title: "Brush wetness:",
                    value:  this.def_values.brush_wet,
                    hide_auto_button: true,
                    value_filter: function (value) {
                        if (canvas) {
                            canvas.brush_wetness = value;
                            if (canvas.brush) {
                                canvas.brush.waterReset (canvas.brush_wetness);
                            }
                        }

                        return value;
                    }
                }),
                opacity: new AdvancedSlider ({
                    name:   "opacity",
                    title:  "Opacity",
                    value:  this.def_values.opacity,
                    auto:   true,
                    target: canvas.paint.opacity
                }),
                granulation: new AdvancedSlider ({
                    name:   "granulation",
                    title:  "Granulation",
                    value:  this.def_values.granulation,
                    auto:   true,
                    target: canvas.paint.granulation
                }),
                noise: new AdvancedSlider ({
                    name:   "noise",
                    title:  "Noise",
                    value:  this.def_values.noise,
                    auto:   true,
                    target: canvas.paint.noise
                }),
                bordersz: new AdvancedSlider ({
                    name:    "bordersz",
                    title:   "Masked border size",
                    measure: "px",
                    value:   16,
                    min: 0,
                    max: 64,
                    hide_auto_button: true,
                    value_filter: function (value) {
                        if (canvas) {
                            var w = 64.0 * value / canvas.paper.width;
                            var h = 64.0 * value / canvas.paper.height;
                            canvas.paper.border.set (w, h, w, h);
                        }

                        return value;
                    }
                }),
                maxparticles: new AdvancedSlider ({
                    name:    "maxparticles",
                    title:   "Max particles",
                    measure: " ",
                    value:   this.def_values.max_particles,
                    min: 100,
                    max: 10000,
                    hide_auto_button: true,
                    value_filter: function (value) {
                        if (canvas) {
                            canvas.setMaxParticles (10000 * value);
                        }

                        return value;
                    }
                })
            };

            this.render ();
        },

        render: function () {
            var canvas = this.canvas;
            var ctel = $("#controls_template");
            var vars = this.def_values;
            var template = _.template (ctel.html(), vars);
            $(this.el).html (template);
            var ctl = this;

            // Init the UI stuff.
            //
            $("#accordion").accordion ({
                collapsible: true,
                autoHeight: false
            });
            $("#commit").button();
            $("#clear").button();
            $("#save").button();
            $("#radioi").buttonset().change (function () {
                if (canvas) {
                    if ($("#i_pencil").is (":checked")) {
                        canvas.setInstrument ("pencil");
                    } else
                    if ($("#i_brush").is (":checked")) {
                        canvas.setInstrument ("brush");
                    } else
                    if ($("#i_splatter").is (":checked")) {
                        canvas.setInstrument ("splatter");
                    } else
                    if ($("#i_eraser").is (":checked")) {
                        canvas.setInstrument ("eraser");
                    }
                }
            });
            $("#controls_brush_inset").append (this.sliders.brushsz.el);
            $("#controls_brush_inset").append (this.sliders.wetness.el);
            $("#controls_paint").append (this.sliders.opacity.el);
            $("#controls_paint").append (this.sliders.granulation.el);
            $("#controls_paint").append (this.sliders.noise.el);
            $("#controls_document").append (this.sliders.bordersz.el);
            $("#controls_debug").append (this.sliders.maxparticles.el);
            $("#snapcolor").click (function () {
                if (canvas) {
                    if (canvas.brush) {
                        canvas.brush.snap_color = $("#snapcolor:checked").val ();
                    }
                }
            });
        },

        toggleDebug: function () {
            if (this.canvas) {
                var ch = $("#debug:checked").val ();
                this.canvas.toggleDebug (ch);
            }
        },

        toggleGravity: function () {
            if (this.canvas) {
                if ($("#gravity:checked").val ()) {
                    this.canvas.resetGlobalVectors (1.0);
                } else {
                    this.canvas.resetGlobalVectors (0.0);
                }
            }
        },

        toggleAutocommit: function () {
            if (this.canvas) {
                if ($("#autocommit:checked").val ()) {
                    this.canvas.COMMIT_TIME = parseInt ($("#committime").val ()) * 1000;
                    this.canvas.auto_commit = true;
                    if (this.canvas.el_status) {
                        this.canvas.el_status.set (
                            "Autocommit set to " + (this.canvas.COMMIT_TIME / 1000) + " second(s).",
                            true
                        );
                    }
                } else {
                    this.canvas.COMMIT_TIME  = 0;
                    this.canvas.commit_timer = 0;
                    this.canvas.auto_commit  = false;
                    if (this.canvas.el_status) {
                        this.canvas.el_status.set (
                            "Autocommit disabled.",
                            true
                        );
                    }
                }
            }
        },

        commitCanvas: function () {
            if (this.canvas) {
                this.canvas.commitGL ();
                this.canvas.commit_timer = 0;
            }
        },

        clearCanvas: function () {
            if (this.canvas) {
                this.canvas.clear ();
            }
        },

        /// Render the whole scene and save the result
        /// using the toDataUrl() method.
        saveCanvas: function () {
            if (this.canvas) {
                var o   = $("#canvas")[0].children[0];
                var cam = this.canvas.wgl.camera;
                var pos = cam.position.clone ();
                var rot = cam.rotation.clone ();
                var sca = cam.scale.clone ();
                var U2  = this.canvas.wgl.material2.uniforms;
                var tc  = U2.ftransform.value.clone ();

                // Resize the canvas to include thw whole painting.
                // FIXME There must be some more elegant way through this...
                var widthbk  = $("#canvas").width ();
                var heightbk = $("#canvas").height ();
                $("#canvas").width (this.canvas.paper.width);
                $("#canvas").height (this.canvas.paper.height);
                this.canvas.resized ();

                // Render the scene with identity transform.
                cam.position = new THREE.Vector3 (0, 350, 0);
                cam.lookAt (new THREE.Vector3 (0, 0, 0));
                cam.rotation.z = 0;

                U2.ftransform.value.identity ();      // Identity transform.
                this.canvas.paper.borderclr.w = 0.0;  // Disable the masked border.
                this.canvas.renderGL (false);
                var strDataURI;
                if (o) {
                    // Try JPEG first...
                    strDataURI = o.toDataURL ("image/jpeg");
                    if (!strDataURI) {
                        strDataURI = o.toDataURL ();
                    }
                }

                // Restore the canvas size.
                $("#canvas").width  (widthbk);
                $("#canvas").height (heightbk);
                this.canvas.resized ();

                // Restore the transforms.
                U2.ftransform.value = tc;
                this.canvas.paper.borderclr.w = 1.0;
                cam.position = pos;
                cam.rotation = rot;
                cam.scale    = sca;

                if (strDataURI) {
                    window.open (strDataURI);
                }

                window.alertBox ("warning", "Canvas has been saved.");
            }
        },

        updateSliders: function (pig) {
            if (this.canvas) {
                var p = this.canvas.paint;
                if (p.opacity.auto) {
                    this.sliders.opacity.set (100 * pig.opacity);
                }
                if (p.granulation.auto) {
                    this.sliders.granulation.set (100 * pig.granulation);
                }
            }
        }
    });

    /**
     * Status-box element.
     */
    window.StatusView = Backbone.View.extend ({
        el : $('#canvas-status'),

        initialize: function (){
          _.bindAll (this, 'render', 'set');

          this.render();
        },

        render : function () {
          $(this.el).append ("<i class='left'></i>");
          $(this.el).append ("<i class='right'></i>");
          $(this.el).append ("<div class='clear'></div>");
        },

        set : function (text, left) {
            if (left) {
                $("i.left", this.el).html (text);
            } else {
                $("i.right", this.el).html (text);
            }
        }
    });
}) (jQuery);
