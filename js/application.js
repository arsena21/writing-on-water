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

(function($){
    var canvas;
    var status;
    var controls;
    var wacom_plugin;

    // Environment.
    var GRAVITY = new THREE.Vector3 (0.0, 0.0, 0.0);
    var LIGHT   = new THREE.Vector3 (1.0, 1.0, 10.0);

    // Particle system.
    var GRID = new window.ParticleGrid ();
    var MYWGL;

    // Constants.
    /** @const */
    var WHITE = new THREE.Color (0xFFFFFF);
    /** @const */
    var BLACK = new THREE.Color (0x000000);
    
    /**
      * Canvas element.
      */
    var Canvas = Backbone.View.extend ({
        el: $('#canvas'),
        events: {
            "mousedown":  "mouseDown",
            "mouseup":    "mouseUp",
            "mousemove":  "mouseMove",
            "mouseleave": "mouseLeave",
            "keypress":   "keyPress",
            "keydown":    "keyPress",
            "keyup":      "keyRelease"
        },

        initialize: function(){
            _.bindAll (this, 'initStuff', 'processStroke', 'mouseDown', 'mouseUp', 'mouseMove',
                       'mouseLeave', 'animate', 'renderGL', 'commitGL', 'keyPress', 'keyRelease', 'removeParticles',
                       'toggleDebug', 'resetGlobalVectors', 'extrapolatedQueue', 'mouseActionRotate',
                       'mouseActionTranslate', 'mouseActionHover', 'clear', 'setBrushScale', 'setMaxParticles',
                       'cameraUpdate', "resized", "setInstrument");
       
            $(document).bind ('keypress', this.keyPress);
            $(document).bind ('keyup',    this.keyRelease);
            $(window).bind   ('resize',   this.resized);

            this.render ();
            this.mouse = {
                x: 0,
                y: 0,
                pressure: 0.0,          // Stylus pressure, if available.
                down: false,            // Mouse button is down.
                rotation: false,        // Canvas rotation mode.
                translation: false,     // Canvas translation mode.    
                forceEvent: false,      // Force the mouse event to be processed.
                strokeQueue: [],        // Buffered brush events.
                strokeQueueDelayed: [], // Queue of the last K stroke points.
                //strokeOrigin: null,     // First point of a stroke.
                stroke: null,           // Stroke mesh reference.
                strokeId: 0,            // Stroke Id.
                
                // User-imposed advection force.
                force: new THREE.Vector3 ()
            };
            this.lastTime = 0;
            
            this.COMMIT_TIME = 2000;
            this.GRID = GRID;
            
            // Brush object.
            this.brush = null;
            this.brush_wetness = 0.9;
            
            /**
              * Paint parameter.
              * @constructor
              */
            var Parameter = function (v, a) {
                this.value = v;
                this.auto  = a;
                this.set = function (newvalue) {
                    if (this.auto) {
                        this.value = newvalue;
                    }
                };
            };
            
            /**
             * Paint description.
             */
            this.paint = {
                viscosity:   new Parameter (0.01, true),   // Paint viscosity.
                opacity:     new Parameter (0.10, true),   // Paint opacity.
                granulation: new Parameter (0.50, true),   // Pigment granulation.
                noise:       new Parameter (0.00, true),   // Luminance noise.
                resistance:  new Parameter (0.00, true),   // Ability of the paint to flow.
                gravity: GRAVITY,                          // Gravity vector.
                timestamp: null,                           // Timestamp of the last commit.
                fromPigment: function (pig) {
                    this.granulation.set (pig.granulation);
                    this.opacity.set     (pig.opacity);
                }
            };
            
            /**
             * Paper description.
             */
            this.paper = {
                width:  800,                                // FIXME Must be set by user.
                height: 600,

                color:    WHITE.clone(),                    // Paper color.
                texture:  new Parameter (0.1, true),        // Paper texture amplitude.
                // Masked border size and color.
                border:    new THREE.Vector4 (0.02, 0.02, 0.02, 0.02),
                borderclr: new THREE.Vector4 (0.75, 0.8, 0.1, 1.0)
            };
            
            this.toggleDebug (false);
            this.config = {
                shaders: {},
                //perm_tex:  null,
                paper_tex:    null,
                blob_tex:     null,
                particle_tex: null,
                first_frame:  true,
                initialized:  false
            };
            
            this.auto_commit  = true;
            this.invalidated  = false;                      // Indicates that there's some uncommited data.
            this.commit_timer = 0;                          // Time left before the wet layer commit.
            this.postcommit   = 0;                          // Time left after commit timer elapsed.
            this.shiney = 0.0;                              // Shiny bar's state.
          
            // Load the shaders.
            new window.MyLoader ("glsl/frag_tx.glsl",      "frag_tx",      status, this.config.shaders);
            new window.MyLoader ("glsl/frag_clr.glsl",     "frag_clr",     status, this.config.shaders);
            new window.MyLoader ("glsl/frag_blob.glsl",    "frag_blob",    status, this.config.shaders);
            new window.MyLoader ("glsl/frag_acc.glsl",     "frag_acc",     status, this.config.shaders);
            new window.MyLoader ("glsl/frag_eff.glsl",     "frag_eff",     status, this.config.shaders);
            new window.MyLoader ("glsl/frag_norm.glsl",    "frag_norm",    status, this.config.shaders);
            new window.MyLoader ("glsl/frag_sobel.glsl",   "frag_sobel",   status, this.config.shaders);
            new window.MyLoader ("glsl/vert_1.glsl",       "vert_1",       status, this.config.shaders);
            new window.MyLoader ("glsl/vert_blob.glsl",    "vert_blob",    status, this.config.shaders);
            new window.MyLoader ("glsl/vert_tr.glsl",      "vert_tr",      status, this.config.shaders);
            new window.MyLoader ("glsl/vert_acc.glsl",     "vert_acc",     status, this.config.shaders);
            
            var c = this.config;
            // Paper normal map.
            c.paper_tex = THREE.ImageUtils.loadTexture ('paper/wc2.jpg');
            c.paper_tex.generateMipmaps = false;
            c.paper_tex.magFilter = THREE.LinearFilter;
            c.paper_tex.minFilter = THREE.LinearFilter;
            c.paper_tex.wrapS = THREE.RepeatWrapping;
            c.paper_tex.wrapT = THREE.RepeatWrapping;
            // Brush blob map.
            c.blob_tex = THREE.ImageUtils.loadTexture ('tex/brush.png');
            c.blob_tex.generateMipmaps = false;
            c.blob_tex.magFilter = THREE.NearestFilter;
            c.blob_tex.minFilter = THREE.NearestFilter;
            // Particle texture (alpha-map).
            c.particle_tex = THREE.ImageUtils.loadTexture ('tex/radial.png');
            c.particle_tex.magFilter = THREE.LinearFilter;
            c.particle_tex.minFilter = THREE.LinearFilter;
            
            // THREE.js stuff init.
            MYWGL = new window.MyWglStuff (this);
            MYWGL.initStuff ();
            
            // Declare some useful functions here.
            var wgl   = this.wgl;
            var mouse = this.mouse;
            //var canvas = this;

            // Particles processor.
            /* FIXME Someday.
            this.worker = new Worker ("js/particles_worker.js");
            this.worker.onmessage = function (e) {
            };
            this.worker.postMessage ({command: "startloop"});
            */

            /// This function is called for each updated particle
            /// and used to keep in sync the webgl attributes.
            this.particleChanged = function (idx, t, c, pig) {
                var a  = wgl.attributes;
                var vo = a.vtransform.value;
                var vc = a.vcolor.value;
                var vp = a.vpigment.value;

                // Particle's offset and scale.
                vo[idx + 0] = t;
                vo[idx + 1] = t;
                vo[idx + 2] = t;
                vo[idx + 3] = t;
                // Particle's color.
                vc[idx + 0] = c;
                vc[idx + 1] = c;
                vc[idx + 2] = c;
                vc[idx + 3] = c;
                // Pigment properties.
                vp[idx + 0] = pig;
                vp[idx + 1] = pig;
                vp[idx + 2] = pig;
                vp[idx + 3] = pig;
                
                a.vcolor.needsUpdate     = true;
                a.vtransform.needsUpdate = true;
                a.vpigment.needsUpdate   = true;
            };
            
            /// This function is called for each updated pylon.
            this.pylonChanged = function (idx, t, c, pig) {
                var p = GRID.allParticles ()[idx / 4];
                
                // Update the radius of each touched pylon.
                p.radius  = p.radius_max;
                p.radius2 = p.radius * p.radius;

                // Each pylon has an associated force vector
                // affecting particles' movement.
                p.F.x = mouse.force.x;
                p.F.y = mouse.force.z;
            };
            
            (this.el).appendChild (this.wgl.renderer.domElement);
            this.animate ();
        },

        initStuff: function () {
            // Check if already inited.
            if (this.wgl.material2 &&
                this.wgl.material3 &&
                this.wgl.material4 &&
                this.wgl.material5 &&
                this.brush &&
                this.brush.isReady ()) {
                if (this.config.first_frame) {
                    // After all wgl-related stuff is ready, 
                    // initialize what's rest.
                    this.config.initialized = true;
                    if (controls) {
                        this.setMaxParticles (controls.sliders.maxparticles.get ());
                    }
                    this.renderGL (true);
                    this.config.first_frame = false;
                    this.resetGlobalVectors (0.0);

                    // Set the default color and we're done.
                    $.farbtastic ('#picker').setColor ("#ee0077");
                    if (status) {
                        status.set (
                            "Initialized.",
                            false
                        );
                    }
                }

                return true;
            }
            
            if (!status) {
                return false;
            }

            // Ensure that the canvas mesh is created.
            if (MYWGL.initCanvasMesh ()) {
                status.set (
                    "Canvas mesh created.",
                    false
                );
            }
            
            // Ensure that the blob mesh is created.
            if (MYWGL.initBlobMesh ()) {
                status.set (
                    "Blob mesh created.",
                    false
                );
            }

            return false;
        },

        /**
         * Enable or disable rendering of debug information.
         */
        toggleDebug: function (toggle) {
            var wgl = this.wgl;
            if (toggle) {
            /*
                var dbg_stroke = new THREE.Mesh (wgl.plane, new THREE.MeshBasicMaterial ({wireframe: true, color: 0x550000}));
                    dbg_stroke.position.y = wgl.stroke.position.y + 1;
                wgl.scene.add (dbg_stroke);
            */

                this.debug = {
                    particle_geom: null,
                    particle_matr: null,
                    pylon_geom: null,
                    pylon_matr: null,
                    dbg_pm: [],
                    dbg_stroke: null,
                    
                    addParticle: function (p) {
                        if (!this.particle_geom) {
                            // Debug particle geometry.
                            var geometry = new THREE.Geometry();
                            //var sphere = new THREE.SphereGeometry (32.0, 4.0, 4.0);
                            var v0 = new THREE.Vector3 (0.0, 0.0, 6.0);
                            var v1 = new THREE.Vector3 (-5.0, 0.0, -5.0);
                            var v2 = new THREE.Vector3 (+5.0, 0.0, -5.0);

                            var face = new THREE.Face3 (geometry.vertices.push(v0) - 1, 
                                                        geometry.vertices.push(v1) - 1,
                                                        geometry.vertices.push(v2) - 1
                                                       );
                            geometry.faces.push (face);
                            geometry.computeFaceNormals();
                            geometry.computeCentroids();
                            this.triangle_geom = THREE.GeometryUtils.clone (geometry)
                                               //THREE.GeometryUtils.merge (geometry, sphere);
                            this.particle_geom = geometry;
                        }
                        if (!this.particle_matr)
                             this.particle_matr = new THREE.MeshBasicMaterial ({
                                 color: 0x110000,
                                 depthTest: false,
                                 depthWrite: false
                             });

                        var pm = new THREE.Mesh (this.particle_geom, this.particle_matr);
                            pm.doubleSided = true;
                        
                        // Points to the same object as the particle's position.
                        pm.position = p.position;
                        pm.rotation = p.rotation;
                        wgl.sceneDebug.add (pm);
                        this.dbg_pm.push (pm);
                    },
                    
                    addPylon: function (pylon) {
/*
                        if (!debug.pylon_geom)
                             debug.pylon_geom = new THREE.SphereGeometry (16, 4, 4);
*/
                        if (this.triangle_geom) {
                            if (!this.pylon_matr)
                                 this.pylon_matr = new THREE.MeshBasicMaterial ({
                                     color: 0xFFFF00,
                                     wireframe: true,
                                     depthTest: false,
                                     depthWrite: false
                                 });

                            var pm = new THREE.Mesh (this.triangle_geom, this.pylon_matr);

                            // Points to the same object as the particle's position.
                            pm.position = pylon.position;
                            pm.rotation = pylon.rotation;
                            pm.scale.x = 1.5;
                            pm.scale.z = 1.5;
                            wgl.sceneDebug.add (pm);
                            this.dbg_pm.push (pm);
                        }
                    }
                };
            } else {
                // Remove the debug meshes from scene.
                if (this.debug) {
                    var pm = this.debug.dbg_pm;
                    if (pm) {
                        for (var j = 0; j < pm.length; j++) {
                            wgl.sceneDebug.remove (pm[j]);
                        }
                    }
                    if (this.debug.dbg_stroke) {
                        wgl.scene.remove (this.debug.dbg_stroke);
                    }
                }
                
                this.debug = null;
            }
        },

        /**
          * Update some stuff and render the scene.
          */
        animate: function () {
            // Update times.
            var timestamp;
            var timeDiff = (function (date) {
                var time = date.getTime();
                var timeDiff  = time - this.lastTime;
                this.lastTime = time;
                GRID.time     = time;

                timeDiff  = Math.min (timeDiff, 10.0);
                timestamp = time;
                return timeDiff;
            }) (new Date());

            // Ensure that all stuff has been inited.
            if (!this.initStuff () || timeDiff < 0.001) {
                requestAnimationFrame (this.animate);
                this.renderGL (true);  
                return;
            }
            
            // Animate the shiny bar.
            this.shiney = Math.min (this.shiney + timeDiff * 0.003, 2.0);

            var M     = this.mouse;
            var brush = this.brush;
            var wgl   = this.wgl;
            var U5    = wgl.material5.uniforms;
            var Q     = M.strokeQueue;
            
            if (!this.paint.timestamp) {
                this.paint.timestamp = timestamp;
            }

            timestamp -= this.paint.timestamp;
            timestamp /= 60.0 * 1000.0;

            // Apply some shader's uniforms:
            // shiny line.
            U5.shinea.value = this.shiney < 1.0 ? 0.8 : 0.0;
            U5.shineln.value = new THREE.Vector4 (
                // a, b, c, 1/(sqrt(a*a + b*b))
                0, 1, -this.shiney, 1
            );
            U5.ftransform.value.identity ();

            // Update the particles.
            var s = {};
            if (GRID.movePaintParticles (this.paint, timestamp, timeDiff / 10.0, s) > 0) {
                if (s.pos_changed)
                    wgl.attributes.vtransform.needsUpdate = true;
                if (s.clr_changed)
                    wgl.attributes.vcolor.needsUpdate = true;
            }
            
            //wgl.attributes.vpigment.needsUpdate = true;

            // Check if it is time to commit a wet layer.
            if (Q.length) {
                // Reset the timer if user is active.
                if (this.brush.template.drymedia) {
                    this.commit_timer = 2;
                } else {
                    this.commit_timer = this.COMMIT_TIME;
                }
                this.postcommit = 0;
            } else {
                this.commit_timer = Math.max (this.commit_timer - timeDiff, 0);
                if (this.commit_timer < 2 && this.invalidated &&
                    (this.auto_commit || this.brush.template.drymedia)) {
                    // We shouldn't commit the layer
                    // until the particles converge. (?)
                    if (s.pos_changed) {
                        this.commit_timer = 1;
                        this.postcommit++;
                        // If we should wait, time interval must be restricted.
                        if (this.postcommit > 200) {
                            this.commitGL ();
                            this.postcommit = 0;
                        } else
                        if (status) {
                            status.set (
                                "Waiting for particles to slow down (" + this.postcommit + ")...",
                                false
                            );
                        }
                    } else 
                        this.commitGL ();
                }
                
                if (status && this.auto_commit && this.commit_timer > 1) {
                    status.set (
                        "Commit timer: " + this.commit_timer,
                        false
                    );
                }
            }

            // Check if the brush is ready.
            if (brush.isReady () && Q.length) {
                // Extrapolate the points array and process the stroke.
                this.processStroke (this.extrapolatedQueue (Q), timestamp);
                
                // Update the old points queue.
                for (var i = 0; i < Q.length; i++) {
                    M.strokeQueueDelayed.push (Q[i]);
                }
                while (M.strokeQueueDelayed.length > 4) {
                       M.strokeQueueDelayed.shift ();
                }
            }
            
            Q.length = 0;

            // Render the scene.
            requestAnimationFrame (this.animate);
            this.renderGL(true);  
        },

        /**
          * Build the list of extrapolated stroke points.
          */
        extrapolatedQueue: function (Q) {
            var queue = [];

            // Init the stroke spline.
            var Q1 = this.mouse.strokeQueueDelayed;
            var l1 = Q.length + Q1.length;
            if (l1 > 1) {
                // Length of curve before the new points.
                var l_head = 0;
                var last = undefined;
                var points_cnv = [];
                var points_ppp = [];

                // Old points.
                for (var i = 0; i < Q1.length; i++) {
                    var q = Q1[i];
                    var p_cnv = new THREE.Vector2 (q.position.x, q.position.z);
                    if (last) {
                        l_head += last.distanceTo (p_cnv);
                    }

                    points_cnv.push (p_cnv);
                    points_ppp.push (new THREE.Vector2 (l_head, q.pressure));
                    last = p_cnv;
                }

                // New points.
                var force = false;
                var l = l_head;
                for (var i = 0; i < Q.length; i++) {
                    var q = Q[i];
                    var p_cnv = new THREE.Vector2 (q.position.x, q.position.z);
                    if (last) {
                        l += last.distanceTo (p_cnv);
                    }

                    points_cnv.push (p_cnv);
                    points_ppp.push (new THREE.Vector2 (l, q.pressure));
                    last = p_cnv;
                    force |= q.force;
                }

                // Curves.
                var spline_cnv = new THREE.SplineCurve (points_cnv);
                var spline_ppp = new THREE.SplineCurve (points_ppp);
                
                var linelen = 1.0 / spline_cnv.getLength ();
                var step  = (this.brush.scale.x * GRID.PARTICLE_R < 4 ? 0.5 : 2.0) * linelen;
                var start = spline_cnv.getUtoTmapping (l_head * linelen);
                
                if (this.brush.template.valid) {
                    step *= this.brush.template.skip;
                }

                // Interpolate the stroke between points.
                l = l_head;
                last = undefined;
                for (var x = start; x < 1.0; x += step) {
                    var c = spline_cnv.getPoint (x);
                    var q = {
                        position: new THREE.Vector3 (c.x, 1.0, c.y),
                        force:    force,
                        pressure: undefined
                    };
                    if (last) {
                        l += last.distanceTo (c);
                        q.force = false;
                    }

                    var p = spline_ppp.getPoint (l * linelen);
                    q.pressure = p.y;
                    queue.push (q);
                    last = c;
                }
            } else {
                for (var i = 0; i < Q.length; i++) {
                    queue.push (Q[i]);
                }
            }
            
            return queue;
        },
                            
        processStroke: function (q, timestamp) {
            var wgl   = this.wgl;
            var brush = this.brush;
            var mouse = this.mouse;
            var paint = this.paint;
            var instr = brush.template;
            
            for (var l = 0; l < q.length; l++) {
                if (GRID.count () >= GRID.MAX_PARTICLES) {
                    window.alertBox ("warning", "Too many particles in the scene!");
                    return;
                }

                // Stroke point.
                var point    = q[l];
                var scale    = brush.scale.clone ();
                var mass     = brush.water;
                var drybrush = Math.max (0.0, 1.0 - brush.water);
                var pos      = point.position.clone ();
                var color    = brush.color;
                var opacity  = Math.min (1.0, paint.opacity.value + instr.opacity);
                var d = instr.dynamics;
                // Apply the brush dynamics if available.
                if (d) {
                    scale    = d.scale   (scale, point.pressure);
                    mass     = d.opacity (mass,  point.pressure);
                    drybrush = d.drybrush ();
                
                    // Apply itter.                
                    pos.x += d.position_jitter (point.pressure) * (1.0 - 2.0 * Math.random ());
                    pos.z += d.position_jitter (point.pressure) * (1.0 - 2.0 * Math.random ());
                }
                
                color = instr.force_color || color;

                scale.x += instr.size_jitter * (1.0 - 2.0 * Math.random ());
                scale.x = Math.max (0.01, scale.x);
                scale.x = Math.min (2.00, scale.x);
                scale.y = scale.x;
                scale.z = scale.x;
                
                drybrush = Math.min (drybrush + 0.5 * this.paper.texture.value, 0.6);

                // Add a stroke blob.
                var blob = new THREE.Mesh (wgl.blob_geom, wgl.material3);
                    blob.position = pos.clone ();
                    blob.position.z *= -1.0;
                    blob.scale = scale;
                wgl.sceneRTT.add (blob);
                wgl.blobsRTT.push (blob);
                
                // Create particles and pylons.
                if (true) {
                    // Spawn a number of randomly placed 
                    // particles within the brush stroke.
                    var r = scale.x;
                    for (var n = r * r, r1 = r * GRID.PARTICLE_R; n >= 0; n--)  {
                        var sample = pos.clone ().addSelf (
                            new THREE.Vector3 (
                                (Math.random () - 0.5) * r1, 0.0,
                                (Math.random () - 0.5) * r1
                            )
                        );

                        // Apply paint on the wet layer.
                        var p = GRID.particlesInteract (
                            sample,                             // Particle position.
                            {                                   //
                                c:  color.clone (),             // Particle color.
                                r:  1.0,                        // Particle radius (was brush.scale.x).
                                m:  mass,                       // Particle mass.
                                g:  paint.granulation.value,    // Pigment granulation.
                                o:  opacity,                    // Pigment opacity.
                                f:  point.force,                // Force the particle creation.
                                stamp: timestamp,               // Deposition timestamp.
                                is_pylon: false,                // Not a pylon.
                                stroke: mouse.strokeId          // Stroke Id.
                            },                                  //
                            brush,                              // Brush object.
                            this.particleChanged
                        );
                        if (p) {
                            if (canvas.debug) {
                                canvas.debug.addParticle (p);
                            }

                            wgl.material3.uniforms.jagged.value.x = 0.5 * (0.8 + drybrush);
                            wgl.material3.uniforms.jagged.value.y = 0.9 * drybrush;

                            // Update the water amount in brush if wet.
                            if (!canvas.brush.template.drymedia) {
                                canvas.brush.waterUpdate (-0.01);
                            }
                        }
                    }

                    var r = Math.min (1.0, scale.x);
                    var n = 1;
                    if (scale.x > 1.0) {
                        n = Math.round (scale.x / r) + 1;
                        r = scale.x / n;
                    }

                    // You must construct additional pylons!
                    for (var y = -scale.x + r; y <= +scale.x - r; y += r) {
                        for (var x = -scale.x + r; x <= +scale.x - r; x += r) {
                            var p = GRID.particlesInteract (
                                // Pylon position.
                                pos.clone ().addSelf (new THREE.Vector3 (32 * x, 0, 32 * y)),
                                {                               //
                                    c:  color.clone (),         // Ignored.
                                    r:  r,                      // Pylon radius.
                                    m:  0.0,                    // Pylons have no mass.
                                    f:  false,                  // Pylons are never forced.
                                    g:  0.0,                    // Ignored.
                                    o:  0.0,                    // Ignored.
                                    stamp: 0.0,                 // Paint resistance.
                                    is_pylon: true,             // A pylon.
                                    stroke: mouse.strokeId      // Stroke Id.
                                },
                                brush,
                                this.pylonChanged
                            );
                            if (p) {
                                if (this.debug) {
                                    this.debug.addPylon (p);
                                }
                            }
                        }
                    }
                }
            }
            
            q.length = 0;
            this.invalidated = true;
        },

        /**
         * Render the stroke and the scene.
         * FIXME Add some flow maps to create the wet-in-wet feathering effects.
         * FIXME Add the map of wetness differences to estimate the location of backruns.
         */
        renderGL: function (drawCircle) {
            var wgl = this.wgl;
            
            // Reset the background texture if needed.
            if (this.config.first_frame) {
                wgl.renderer.setClearColor (this.paper.color, 255);
                wgl.renderer.render (wgl.sceneRTT, wgl.cameraRTT, wgl.rtt_canvas, true);
            }
            
            var U2 = wgl.material2 ? wgl.material2.uniforms : undefined;
            var U5 = wgl.material5 ? wgl.material5.uniforms : undefined;
            wgl.renderer.setClearColor (BLACK, 255);

            // Update the stroke texture.
            if (wgl.blobsRTT.length) {
                // Update the blob color.
                wgl.material3.attributes.vcolor.needsUpdate = true;
                var v = wgl.material3.attributes.vcolor.value;
                v[0].setRGB (1.0, 0, this.mouse.strokeId / 1.0);
                v[1].copy (v[0]);
                v[2].copy (v[0]);
                v[3].copy (v[0]);
                
                // Render the blobs and clear the texture if needed.
                wgl.stroke.visible = false;
                wgl.renderer.render (wgl.sceneRTT, wgl.cameraRTT, wgl.rtt_stroke, wgl.stroke.needsClear);
                wgl.stroke.needsClear = false;

                // Remove the stroke blobs.
                for (var i = 0, len = wgl.blobsRTT.length; i < len; i++) {
                    wgl.sceneRTT.remove (wgl.blobsRTT[i]);
                }
                wgl.blobsRTT.length = 0;
            }

            // Prepare the color map.
            if (wgl.stroke) {
                wgl.stroke.visible = true;
                wgl.material4.uniforms.pass.value = 0;
                // Init the buffer with white color and a tiny alpha.
                // FIXME This whitens every color in the result a little bit.
                // FIXME This accumulator thing is not very fast (and needs three passes) and has to use float textures...
                wgl.renderer.setClearColor (WHITE, 1);
                wgl.renderer.render (wgl.sceneRTT, wgl.cameraRTT, wgl.rtt_acc, true);
                wgl.renderer.setClearColor (new THREE.Color (0xff0000), 0);
                wgl.material4.uniforms.pass.value = 1;
                wgl.renderer.render (wgl.sceneRTT, wgl.cameraRTT, wgl.rtt_acc1, true);
                wgl.renderer.setClearColor (new THREE.Color (0x000000), 0);
                wgl.material4.uniforms.pass.value = 2;
                wgl.renderer.render (wgl.sceneRTT, wgl.cameraRTT, wgl.rtt_acc2, true);
            }
            
            if (wgl.flowmap.composer) {
                wgl.flowmap.composer.render (0.01);
                U2.flowmap.texture = wgl.flowmap.composer.readBuffer;
            }

            // Re-read the paint parameters.
            if (U2) {// && !wgl.stroke.needsClear) {
                //U2.renderpar0.value.x = this.paint.opacity.value;
                U2.renderpar0.value.w = this.paint.noise.value;
                U2.renderpar0.value.z = this.paper.texture.value;
            }
            if (drawCircle && U5 && this.brush && this.brush.pointer_mesh) {
                U5.circle.value.set (
                    this.brush.pointer_mesh.position.x / this.paper.width + 0.5,
                    0.5 - this.brush.pointer_mesh.position.z / this.paper.height,
                    0.05,
                    this.commit_timer / this.COMMIT_TIME
                );
            }

            // Render the scene to screen.
            wgl.scene.add (wgl.camera);
            wgl.renderer.setClearColor (BLACK, 255);
            wgl.renderer.render (wgl.scene, wgl.camera, null, true);

            // Render the debug info.
            if (this.debug) {
                wgl.sceneDebug.add (wgl.camera);
                wgl.renderer.render (wgl.sceneDebug, wgl.camera, null, false);
            }
        },

        /**
          * Update the canvas texture with new stroke.
          * There is some white magic in this method,.. but in general,
          * it changes some rendering options and renders the scene onto
          * the background.
          */
        commitGL: function (drymedia_force) {
            if (!this.config.initialized ||
                !this.invalidated)
                return;

            var wgl = this.wgl;
            var drymedia = this.brush.template.drymedia;
            if (drymedia_force !== undefined) {
                drymedia = drymedia_force;
            }
        
            // Define the source and destination textures.
            var src, dst;
            if (wgl.rtt_canvas == wgl.rtt_canvas0) {
                src = wgl.rtt_canvas0;
                dst = wgl.rtt_canvas1;
            } else {
                src = wgl.rtt_canvas1;
                dst = wgl.rtt_canvas0;
            }

            // The scene will contain the cloned canvas mesh.
            wgl.plane_clone.visible = true;
            wgl.sceneRTT.add (wgl.plane_clone);

            // Some magic has to be done...
            var u = wgl.material2.uniforms;
            var t = u.ftransform.value.clone ();
            u.ftransform.value.identity ().scale (new THREE.Vector3 (1, -1, 1));
            u.txmul1.value.set (+1.0, -1.0);
            u.txadd1.value.set (+0.0, +1.0);
            u.renderpar0.value.y = drymedia ? 0.0 : 0.8;    // Enable darkening of the edges, if wet.
            u.renderpar0.value.z = 0.0;                     // Disable the paper bump-map.
            this.paper.borderclr.w = 0.0;                   // Disable the masked border.

            // Prepare the edge map.
            wgl.darkedges.composer.render (0.01);
            u.edgemap.texture = wgl.darkedges.composer.readBuffer;

            // Render!
            wgl.stroke.visible = false;
            wgl.renderer.render (wgl.sceneRTT, wgl.cameraRTT, dst, true);
            wgl.sceneRTT.remove (wgl.plane_clone);

            // Restore the modified uniforms.
            u.txmul1.value.set (1.0, 1.0);
            u.txadd1.value.set (0.0, 0.0);
            u.ftransform.value = t;
            u.renderpar0.value.y = 0.0;
            u.renderpar0.value.z = this.paper.texture.value;
            u.noiseoffset.value.x = Math.random ();
            u.noiseoffset.value.y = Math.random ();
            // Set the stroke's opacity and noise to zero.
            //u.renderpar0.value.x = 0.0;
            u.renderpar0.value.w = 0.0;
            this.paper.borderclr.w = 1.0;

            // Swap the canvas textures.
            wgl.rtt_canvas = dst;
            wgl.material2.uniforms.background.texture  = dst;

            // Request the stroke texture reset.
            wgl.stroke.needsClear = true;
            
            if (!drymedia) {
                // Reset the shiny line if the instrument is wet.
                // For dry media commits are transparent to user.
                this.shiney = 0.0;
            }
            this.commit_timer = 0;
            this.mouse.strokeId = 0;
            this.paint.timestamp = null;
            
            // Remove all particles.
            this.removeParticles ();
            this.invalidated = false;

            if (status && !drymedia) {
                status.set (
                    "Layer commited.",
                    false
                );
            }
        },

        /**
         * Clear the canvas.
         */
        clear: function () {
            this.commitGL ();
            this.shiney = 2.0;
            
            var wgl = this.wgl;
            wgl.renderer.setClearColor (this.paper.color, 255);
            wgl.renderer.render (wgl.sceneRTT, wgl.cameraRTT, wgl.rtt_canvas, true);

            window.alertBox ("warning", "Canvas cleared.");
        },
        
        /**
         * Change the brush scale and
         * update the pointer size.
         */
        setBrushScale: function (sz) {
            var b = this.brush;
            if (b) {
                if (b.isReady ()) {
                    b.scale = new THREE.Vector3 (sz, sz, sz);
                    b.pointer_mesh.scale = b.scale;
                    b.pointer_mesh.position.x = 0.0;
                    b.pointer_mesh.position.z = 0.0;
                    b.pointer_mesh.visible    = true;
                }
            }
        },
        
        /**
          * Clear the particles list and 
          * corresponding debug info.
          */
        removeParticles: function () {
            // Move unused particles out of the scene.
            var wgl = this.wgl;
            if (wgl.attributes) {
                var vo = wgl.attributes.vtransform.value;
                for (var i = 0, len = 4 * GRID.count (); i < len; i++) {
                    vo[i] = GRID.badVector;
                }
            }

            GRID.clear ();
            wgl.attributes.vtransform.needsUpdate = true;
            
            if (this.debug) {
                var pm = this.debug.dbg_pm;
                if (pm) {
                    for (var i = 0; i < pm.length; i++) {
                        wgl.sceneDebug.remove (pm[i]);
                    }

                    pm.length = 0;
                }
            }
        },
        
        /**
         * Reset the gravity and light vectors and rotate them
         * to make them agnostic to camera movement.
         */
        resetGlobalVectors: function (g) {
            if (!canvas) {
                return;
            }

            var l1 = new THREE.Vector3 (1.0, 5.0, 1.0);
            GRAVITY.set (0, 0, g);
            
            var a = canvas.wgl.camera.rotation.z;
            var m = new THREE.Matrix4 ().identity ().rotateY (a);

            // Rotate the gravity vector.
            if (GRAVITY.length () > 0.001) {
                GRAVITY = m.multiplyVector3 (GRAVITY);
            }
            
            // Rotate the light vector.
            //l1 = m.multiplyVector3 (l1);
            //LIGHT.x = l1.x;
            //LIGHT.y = l1.z;
            //LIGHT.z = l1.y;
            LIGHT.normalize ();

            this.wgl.material2.uniforms.lightdir.value = LIGHT;
        },
        
        /**
         * Set the new maximum for the particles
         * in the scene and re-create some objects.
         */
        setMaxParticles: function (n) {
            var wgl   = this.wgl;
            var mouse = this.mouse;
            if (!wgl.stroke)
                return;

            this.removeParticles ();
            
            wgl.scene.remove (wgl.plane);
            wgl.scene.remove (wgl.plane1);
            wgl.sceneRTT.remove (wgl.stroke);

            // Construct a new stroke mesh.
            wgl.material2 = null;
            wgl.material4 = null;
            wgl.material5 = null;
            MYWGL.newStrokeGeometry (wgl, GRID.badVector, n);
            MYWGL.initCanvasMesh (this);
            
            wgl.stroke.needsClear = true;
            
            // Some uniforms need to be reset.
            wgl.material2.uniforms.lightdir.value = LIGHT;
            //wgl.material2.uniforms.renderpar0.value.x = 0.0;
            var v = new THREE.Vector3 (mouse.x, mouse.y, 1);
            this.mouseActionRotate    (mouse, v.clone ());
            this.mouseActionTranslate (mouse, v.clone ());

            GRID.MAX_PARTICLES = n;
            GRID.allocatePool ();
        },

        mouseDown: function (e){
            var m = this.mouse;
            m.down = true;
            m.strokeId++;
            m.strokeQueueDelayed.length = 0;
            m.forceEvent = true;

            this.mouseMove (e);
        },

        mouseUp: function () {
            // Reset the stroke.
            if (this.brush) {
                this.brush.waterReset (this.brush_wetness);
            }
            
            var m = this.mouse;
            m.down = false;
            //m.strokeOrigin     = null;
            m.strokeQueueDelayed.length = 0;
        },

        mouseMove: function (e) {
            if (this.el != null) {
                var x = e.pageX - this.el_x;
                var y = e.pageY - this.el_y;
                var v = new THREE.Vector3 (
                    (x / this.el_w) * 2 - 1,
                   -(y / this.el_h) * 2 + 1,
                     1);

                var mouse = this.mouse;
                
                // Ignore the duplicate events.
                if (Math.abs (v.x - mouse.x) < 1.0 / this.el_w &&
                    Math.abs (v.y - mouse.y) < 1.0 / this.el_h &&
                    !mouse.forceEvent) {
                    return;
                }

                var fx = 1.0 * (v.x - mouse.x);
                var fz = 1.0 * (mouse.y - v.y);
                var a = this.wgl.camera.rotation.z;

                // Camera rotation must be considered.
                mouse.force.set (
                    fx * Math.cos (a) + fz * Math.sin (a), 0.0, 
                   -fx * Math.sin (a) + fz * Math.cos (a)
                );
/*
                if (!mouse.strokeOrigin) {
                     mouse.strokeOrigin = new THREE.Vector3 (x, y, 1);
                }
*/                
                if (e.shiftKey) {
                    // Rotate the canvas with mouse.
                    mouse.rotation = true;
                    this.mouseActionRotate (mouse, v.clone ());
                    if (this.brush.isReady ()) {
                        this.brush.pointer_mesh.visible = false;
                    }
                } else {
                    mouse.rotation = false;
                    if (mouse.translation) {
                        // Translation mode.
                        this.mouseActionTranslate (mouse, v.clone ());
                        if (this.brush.isReady ()) {
                            this.brush.pointer_mesh.visible = false;
                        }
                    } else {
                        // Regular mode (painting).
                        this.mouseActionHover (mouse, v.clone ());
                    }
                }
                
                mouse.x = v.x;
                mouse.y = v.y;
                mouse.forceEvent = false;
            }
        },
        
        mouseLeave: function (e) {
            this.mouseUp ();
            if (this.brush) {
                if (this.brush.isReady ()) {
                    this.brush.pointer_mesh.visible = false;
                }
            }
        },
        
        /**
         * Rotate the camera by mouse.
         */
        mouseActionRotate: function (mouse, v) {
            var c = this.wgl.camera;
            c.matrix.rotateZ (
                Math.atan2 (mouse.y, mouse.x) - 
                Math.atan2 (v.y, v.x)
            );
            //c.rotation.getRotationFromMatrix (c.matrix);
            c.rotation.setEulerFromRotationMatrix (c.matrix);

            this.resetGlobalVectors (GRAVITY.length ());
            this.cameraUpdate (c);

            if (status) {
                var s = 'Camera rotation: ';
                    s += Math.round (180.0 * c.rotation.z / Math.PI) % 360;
                    s += ' deg';

                status.set (s, true);
            }
        },
        
        /**
         * Translate the camera by mouse.
         */
        mouseActionTranslate : function (mouse, v) {
            var c = this.wgl.camera;
            c.translateX (-(v.x - mouse.x) * this.el_w);
            c.translateY (-(v.y - mouse.y) * this.el_h);
            
            this.cameraUpdate (c);

            if (status) {
                var s = 'Camera translation: ';
                    s += -Math.round (c.position.x) + ', ';
                    s += -Math.round (c.position.z);
                    s += ' px';

                status.set (s, true);
            }
        },
        
        cameraUpdate : function (c) {
            // Tell the shader that camera has been changed.
            if (this.wgl.material2) {
                this.wgl.material2.uniforms.ftransform.value.identity ()
                .translate (
                    new THREE.Vector3 (c.position.x, -c.position.z, 0.0)
                )
                .rotateZ (
                    c.rotation.z
                );
            }
        },
        
        /**
         * Process the mouse interaction with canvas.
         */
        mouseActionHover: function (mouse, v) {
            var cam = this.wgl.camera;
            var br  = this.brush;
            var wgl = this.wgl;
            if (!br) {
                return;
            }
            
            // Find the intersection with canvas plane in world space. %)
            wgl.projector.unprojectVector (v, cam);
            wgl.ray.origin = cam.position;
            wgl.ray.direction = v.subSelf (cam.position).normalize();
            var intersects = wgl.ray.intersectObject (wgl.plane);
            if (intersects.length == 0) {
                if (br.isReady ()) {
                    br.pointer_mesh.visible = false;
                }
                return;
            }
            
            // If found, queue the intersection point.
            v = intersects[0].point;
            var point = {
                position: v.clone (),
                pressure: 1.0,
                force:    mouse.forceEvent
            };

            point.position.y = 1.0;
            
            // Ping the wacom plugin, if any.
            if (wacom_plugin) {
                if (wacom_plugin.isWacom &&
                    wacom_plugin.pointerType == 1) {
                    point.pressure = wacom_plugin.pressure;
                }
            }
            
            if (br) {
                if (br.isReady ()) {
                    br.pointer_mesh.visible = true;
                    br.changePosition (new THREE.Vector3 (v.x, 2, v.z));
                }
                
                if (mouse.down) {
                    // Buffer the stroke to paint.
                    mouse.strokeQueue.push (point);
                    
                    if (status) {
                        var s = [];
                        s.push ('Painting at (');
                        s.push ('' + Math.round (point.position.x));
                        s.push (', ');
                        s.push ('' + Math.round (point.position.z));
                        s.push (') with wetness ');
                        s.push ('' + br.water.toFixed(2));
                        s.push (' and pressure ');
                        s.push ('' + point.pressure.toFixed(2));
                        status.set (s.join (''), true);
                    }
                } else {
                    if (status) {
                        var s = [];
                        s.push ('Hover at (');
                        s.push ('' + Math.round (point.position.x));
                        s.push (', ');
                        s.push ('' + Math.round (point.position.z));
                        s.push (')');
                        status.set (s.join (''), true);
                    }
                }
            }
        },

        keyPress: function (e) {
            if (e.which == 32) {
                if (this.brush.isReady ()) {
                    this.brush.pointer_mesh.visible = false;
                }
                
                e.preventDefault();
                if (!this.mouse.translation) {
                     this.mouse.translation = true;
                    if (status) {
                        status.set (
                            'Translation mode on',
                            true
                        );
                    }
                }
            }
        },
        keyRelease: function (e) {
            if (e.which == 32) {
                e.preventDefault();
                if (this.mouse.translation) {
                    this.mouse.translation = false;
                    if (status) {
                        status.set (
                            'Translation mode off',
                            true
                        );
                    }
                }
            }
        },
        
        /**
         * Update some stuff if the canvas has beed resized.
         */
        resized: function () {
            var o = this.el;
            var abs_top  = 0;
            var abs_left = 0;
            while (o) {
                abs_top  += o.offsetTop;
                abs_left += o.offsetLeft;
                o = o.offsetParent;
            };
            
            this.el_x = abs_left;
            this.el_y = abs_top;
            var viewW = this.el_w = (this.el).offsetWidth  - 2;
            var viewH = this.el_h = (this.el).offsetHeight - 2;

            // Try to keep the scale intact,
            // disregarding the viewport resize.
            var wgl  = this.wgl;
            wgl.zoom = viewH / this.paper.height;
            wgl.camera.fov = 80.0 * wgl.zoom;
            wgl.camera.aspect = viewW / viewH;
            wgl.camera.updateProjectionMatrix ();

            wgl.renderer.setSize (viewW, viewH);
        },
        
        /**
         * Set a new instrument template.
         */
        setInstrument: function (template) {
            if (!this.brush)
                return;
                
            var i = this.brush.template;
            var drymedia = i.drymedia;
            
            // Push the instrument state.
            if (i.valid) {
                i.state.size    = GRID.PARTICLE_R * this.brush.scale.x;
                i.state.color   = this.brush.basecolor.getHex ();
                i.state.valid   = true;
            }
            
            // Change the template.
            i.set (template);
            
            if (drymedia != i.drymedia) {
                // Commit when changing between wet and
                // dry instruments.
                this.commitGL (drymedia);
            }
            
            if (i.valid) {
                // Pop the instrument state.
                if (i.state.valid) {
                    var clr = "#" + i.state.color.toString(16);
                    if (controls) {
                        controls.sliders.brushsz.range (i.min_size, i.max_size);
                        controls.sliders.brushsz.set   (i.state.size);
                    }
                    $.farbtastic ('#picker').setColor (clr);
                }

                this.paint.noise.set (i.noise);
                this.paint.resistance.set (i.resistance);
                if (this.paint.noise.auto && controls) {
                    controls.sliders.noise.set (100 * i.noise);
                }
            }
        }
    });
    
    // Check for WebGL support and create stuff.
    $(document).ready (function () {
        if (!Detector.webgl) {
            $('#hint').hide ();
            $('#canvas').hide ();
            $('#canvas-status').hide ();
            $('#pane').hide ();

            Detector.addGetWebGLMessage ();
        } else {
            /// Add a distanceTo method to the Color class.
            THREE.Color.prototype.distanceTo = function (target) {
                var dx = this.r - target.r;
                var dy = this.g - target.g;
                var dz = this.b - target.b;
                return Math.sqrt (dx * dx + dy * dy + dz * dz);
            };
            
            status = new window.StatusView ();
            canvas = new Canvas ();
            
            // Init color wheel.
            $('#picker').farbtastic (
                function (color) {
                    if (canvas.brush) {
                        canvas.brush.changeColor (color);
                        var pig = canvas.brush.pigment;
                        
                        // If pigment is known, update the paint properties.
                        if (pig) {
                            // Update the controls.
                            if (controls) {
                                controls.updateSliders (pig);
                            }
                            // Update the paint properties.
                            canvas.paint.fromPigment (pig);

                            // Display the pigment.
                            $('#colorlabel').html (pig.name);
                            $('#colorsample').css ("background-color", pig.colorstr);
                        }
                    }
                }
            );

            controls = new window.ControlsView ({canvas: canvas});
            wacom_plugin = document.getElementById ("wacom-plugin");

            document.onselectstart = function() {
                return false;
            };

            // "Hide hint" link.
            if ($.session.get ("hidehint")) {
                $('#hint').hide ();
            } else {
                $('#hidehint').click (
                    function () {
                        $('#hint').hide ();
                        $.session.set ("hidehint", true)
                    }
                );
            }
        }
    });

})(jQuery);
