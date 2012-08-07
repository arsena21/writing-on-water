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
    window.MyWglStuff = function (canvas) {
    
        /**
         * Create a paintable material that will be our
         * destination for rendering the stuff.
         */
        this.renderTarget = function (width, height, type, format) {
            return new THREE.WebGLRenderTarget (
                width, height, {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: format,
                    type: type
                }
            );
        };

        this.initStuff = function () {
            var viewW = (canvas.el).offsetWidth  - 2;
            var viewH = (canvas.el).offsetHeight - 2;

            var ASPECT = viewW / viewH;
            var renderer = new THREE.WebGLRenderer ({antialias: true});
                renderer.setSize (viewW, viewH);
                renderer.autoClear = false;
                renderer.setClearColor (new THREE.Color (0x000000), 255);

            var PLANE_W = canvas.paper.width;
            var PLANE_H = canvas.paper.height;

            canvas.wgl = {
                renderer: renderer,
                camera:
                    new THREE.PerspectiveCamera(
                        80,  // VIEW_ANGLE,
                        ASPECT,
                        200, // NEAR,
                        500  // FAR
                    ),

                // Orthographic camera for render-to-texture passes.
                cameraRTT:
                    new THREE.OrthographicCamera (
                        PLANE_W / -2, 
                        PLANE_W / 2,
                        PLANE_H / 2,
                        PLANE_H / -2,
                        -10000, 
                         10000
                    ),

                scene:      new THREE.Scene(),
                sceneDebug: new THREE.Scene(),
                sceneRTT:   new THREE.Scene(),

                // Auxilary stuff to find the pen position on a canvas plane.
                projector:  new THREE.Projector (),
                ray:        new THREE.Ray (),

                // Two canvas textures for ping-pong rendering.
                // These will represent user's artwork in its current state.
                rtt_canvas0: this.renderTarget (PLANE_W, PLANE_H, THREE.UnsignedByteType, THREE.RGBFormat),
                rtt_canvas1: this.renderTarget (PLANE_W, PLANE_H, THREE.UnsignedByteType, THREE.RGBFormat),
                rtt_canvas:  undefined,

                // Stroke texture contains the brush stroke mask.
                rtt_stroke: this.renderTarget (PLANE_W, PLANE_H, THREE.UnsignedByteType, THREE.RGBFormat),

                // Accumulator texture contains the sum of particle colors.
                // Accumulator textures are downscaled to reduce the rendering time.
                // FIXME UnsignedShortType ?
                // FIXME Maybe I cound use moving average here, using the byte precision instead of float...
                rtt_acc:  this.renderTarget (PLANE_W / 4, PLANE_H / 4, THREE.FloatType, THREE.RGBAFormat),
                rtt_acc1: this.renderTarget (PLANE_W / 8, PLANE_H / 8, THREE.FloatType, THREE.RGBAFormat),
                rtt_acc2: this.renderTarget (PLANE_W / 8, PLANE_H / 8, THREE.FloatType, THREE.RGBAFormat),

              //material1:   null,
                material2:   null,    // Stroke mesh material.
                material3:   null,    // Blob material.
                material4:   null,    // Accumulator material.
                material5:   null,    // Effects material.
                plane:       null,
                plane_clone: null,
                stroke:      null,

                // RTT stroke blob geometry and material
                // to render onto the stroke plane.
                blob_geom: new THREE.PlaneGeometry (64, 64),
                blobsRTT: [],

                // Backdrop mesh.
                backdrop: new THREE.Mesh (
                    new THREE.PlaneGeometry (4096, 4096, 8, 8),
                    new THREE.MeshBasicMaterial ({
                        color: 0xbbbbbb,
                        map: THREE.ImageUtils.loadTexture ('tex/backdrop.jpg')
                    })
                ),

                darkedges: {
                    edgepass:      null,
                    blurpass_x:    null,
                    blurpass_y:    null,
                    composer:      null
                },
                flowmap: {
                    normpass:      null,
                    edgepass:      null,
                    composer:      null
                },

                particles: new THREE.Geometry ()
            };

            var wgl = canvas.wgl;

            // Construct a stroke mesh.
            this.newStrokeGeometry (
                wgl,
                canvas.GRID.badVector,
                canvas.GRID.MAX_PARTICLES
            );

            wgl.rtt_acc.generateMipmaps = false;
            wgl.rtt_acc.depthBuffer = false;
            wgl.rtt_acc.stencilBuffer = false;
            wgl.rtt_acc.magFilter = THREE.LinearFilter;
            wgl.rtt_acc.minFilter = THREE.NearestFilter;
            wgl.rtt_acc1.generateMipmaps = false;
            wgl.rtt_acc1.depthBuffer = false;
            wgl.rtt_acc1.stencilBuffer = false;
            wgl.rtt_acc1.magFilter = THREE.LinearFilter;
            wgl.rtt_acc1.minFilter = THREE.NearestFilter;
            wgl.rtt_acc2.generateMipmaps = false;
            wgl.rtt_acc2.depthBuffer = false;
            wgl.rtt_acc2.stencilBuffer = false;
            wgl.rtt_acc2.magFilter = THREE.LinearFilter;
            wgl.rtt_acc2.minFilter = THREE.NearestFilter;
            wgl.rtt_stroke.generateMipmaps = false;
            wgl.rtt_stroke.depthBuffer = false;
            wgl.rtt_stroke.stencilBuffer = false;
            wgl.rtt_stroke.magFilter = THREE.LinearFilter;
            wgl.rtt_stroke.minFilter = THREE.LinearFilter;
            wgl.rtt_canvas0.generateMipmaps = false;
            wgl.rtt_canvas0.depthBuffer = false;
            wgl.rtt_canvas0.stencilBuffer = false;
            wgl.rtt_canvas0.magFilter = THREE.LinearFilter;
            wgl.rtt_canvas0.minFilter = THREE.LinearFilter;
            wgl.rtt_canvas1.generateMipmaps = false;
            wgl.rtt_canvas1.depthBuffer = false;
            wgl.rtt_canvas1.stencilBuffer = false;
            wgl.rtt_canvas1.magFilter = THREE.LinearFilter;
            wgl.rtt_canvas1.minFilter = THREE.LinearFilter;

            // As we render only planes we may omit
            // the depth testing by sorting our objects.
            wgl.renderer.sortObjects = true;

            // Setup the cameras.
            wgl.rtt_canvas = wgl.rtt_canvas0;
            wgl.camera.position.y = 350;
            wgl.camera.lookAt (new THREE.Vector3 (0, 0, 0));
            wgl.camera.rotation.z = 0;
            wgl.scene.add (wgl.camera);
            wgl.cameraRTT.position.y = 350;
            wgl.cameraRTT.lookAt (new THREE.Vector3 (0, 0, 0));
            wgl.cameraRTT.rotation.z = 0;
            wgl.sceneRTT.add (wgl.cameraRTT);

            // Tile the backdrop texture.
            wgl.backdrop.position.y = -1;
            wgl.backdrop.doubleSided = true;
            wgl.backdrop.material.map.wrapS = THREE.RepeatWrapping;
            wgl.backdrop.material.map.wrapT = THREE.RepeatWrapping;
            wgl.backdrop.material.map.repeat.x = 32;
            wgl.backdrop.material.map.repeat.y = 32;
            wgl.scene.add (wgl.backdrop);

            wgl.blob_geom.dynamic = true;

            canvas.resized ();
        };

        this.newStrokeGeometry = function (wgl, inf, n) {
            var particles = new THREE.Geometry ();

            // Setup the stroke mesh.
            var v = particles.vertices;
            var f = particles.faces;
            var u = particles.faceVertexUvs[0];
            var r = 1.0;
            for (var i = 0, j = 0; i < n; i++, j += 4) {
                v.push (new THREE.Vector3 (-r, 0.0, -r));
                v.push (new THREE.Vector3 (+r, 0.0, -r));
                v.push (new THREE.Vector3 (+r, 0.0, +r));
                v.push (new THREE.Vector3 (-r, 0.0, +r));
                u.push ([
                    new THREE.UV (0.0, 0.0),
                    new THREE.UV (1.0, 0.0),
                    new THREE.UV (1.0, 1.0),
                    new THREE.UV (0.0, 1.0)
                ]);
                f.push (new THREE.Face4 (j + 0, j + 1, j + 2, j + 3));
                //f.push (new THREE.Face3 (j + 1, j + 2, j + 3));
            }

            particles.dynamic = true;
            particles.__dirtyUvs = true;
            particles.__dirtyVertices = true;

            particles.computeCentroids ();
            particles.computeFaceNormals ();
            particles.computeVertexNormals ();

            var attributes = {
                vtransform: {type: 'v4', value: []},
                vcolor:     {type: 'c',  value: []},
                vpigment:   {type: 'v4', value: []}
            };

            // Init the stroke mesh attributes with some junk.
            var vc = attributes.vcolor.value
            var vo = attributes.vtransform.value
            var vp = attributes.vpigment.value
            var nv = 4 * n;
            for (var i = 0; i < nv; i++) {
                vc[i] = new THREE.Color (0xff00cc);
                vo[i] = inf;
                vp[i] = new THREE.Vector4 ();
            }

            attributes.vcolor.needsUpdate     = true;
            attributes.vtransform.needsUpdate = true;
            attributes.vpigment.needsUpdate   = true;

            wgl.particles  = particles;
            wgl.attributes = attributes;
            if (wgl.material4) {
                wgl.material4.attributes = attributes;
            }
        }

        /**
         * 
         */
        this.initCanvasMesh = function () {
            var cfg = canvas.config;
            var wgl = canvas.wgl;
            if (cfg.shaders['vert_acc'] &&
                cfg.shaders['vert_tr'] &&
                cfg.shaders['vert_1'] &&
                cfg.shaders['frag_clr'] &&
                cfg.shaders['frag_acc'] &&
                cfg.shaders['frag_eff'] &&
                cfg.shaders['frag_norm'] &&
                cfg.shaders['frag_sobel'] &&
                cfg.paper_tex &&
                cfg.particle_tex &&
               !wgl.material2 &&
               !wgl.material4 &&
               !wgl.material5) {

                var vert0 = cfg.shaders['vert_tr'];
                var frag0 = cfg.shaders['frag_clr'];
                var vert1 = cfg.shaders['vert_acc'];
                var frag1 = cfg.shaders['frag_acc'];
                var frag2 = cfg.shaders['frag_eff'];
                var vert3 = cfg.shaders['vert_1'];
                var frag3 = cfg.shaders['frag_sobel'];
                var frag4 = cfg.shaders['frag_norm'];

                var rtt  = wgl.rtt_canvas;        
                var rtt1 = wgl.rtt_stroke;

                var txmul = new THREE.Vector2 (
                    1.0 / canvas.paper.width,
                    1.0 / canvas.paper.height
                );
                var txstep = new THREE.Vector2 (
                    1.0 / canvas.paper.width,
                    1.0 / canvas.paper.height
                );

                //var perm = cfg.perm_tex;     // Permutation matrix.
                var norm = cfg.paper_tex;    // Paper normal map,
                var amap = cfg.particle_tex; // Particle's alpha map.

                // And, finally, the shader material.
                wgl.material2 = new THREE.ShaderMaterial( {
                    uniforms: {
                        mask:        {type: "t",  value: 0, texture: rtt1},                 // Stroke mask.
                        background:  {type: "t",  value: 1, texture: rtt},                  // Background image.
                        //perm:        {type: "t",  value: 2, texture: perm},                 // Noise permutaion map.
                        papernorm:   {type: "t",  value: 3, texture: norm},                 // Paper normal map.
                        colormap:    {type: "t",  value: 4, texture: wgl.rtt_acc},          // Color map.
                        mapweights0: {type: "t",  value: 5, texture: wgl.rtt_acc1},         // Color map weights.
                        mapweights1: {type: "t",  value: 6, texture: wgl.rtt_acc2},         // Color map weights.
                        edgemap:     {type: "t",  value: 7, texture: null},                 // Edge map.
                        flowmap:     {type: "t",  value: 8, texture: null},                 // Flow map.
                        txadd:       {type: "v2", value: new THREE.Vector2()},              // Texcoords transform 0.
                        txmul:       {type: "v2", value: txmul},                            // Texcoords transform 0.
                        txadd1:      {type: "v2", value: new THREE.Vector2(0.0, 0.0)},      // Texcoords transform 1.
                        txmul1:      {type: "v2", value: new THREE.Vector2(1.0, 1.0)},      // Texcoords transform 1.
                        txstep:      {type: "v2", value: txstep},                           // Single pixel step.
                        noiseoffset: {type: "v2", value: new THREE.Vector2 (0, 0)},         // Noise texture offset.
                        lightdir:    {type: "v3", value: new THREE.Vector3 (0, 1, 0)},      // Light direction.
                        /**
                         * renderpar0 = {
                         *      unused,      // 
                         *      edgepower,   // Edge darkening intensity.
                         *      bumppower,   // Bump map intensity.
                         *      noise        // Noise intensity.
                         * };
                         */
                        renderpar0:  {type: "v4", value: new THREE.Vector4 (0.0, 0.0, 1.0, 0.0)},
                        ftransform:  {type: "m4", value: new THREE.Matrix4 ().identity ()},
                        bordersz:    {type: "v4", value: canvas.paper.border},              // Masked border size.
                        borderclr:   {type: "v4", value: canvas.paper.borderclr}            // Masked border color.
                    },
                    vertexShader:   vert0,
                    fragmentShader: frag0,

                    //depthTest: false,
                    //depthWrite: false
                } );

                // Canvas plane mesh to render onto the screen.
                wgl.plane = new THREE.Mesh (
                    new THREE.PlaneGeometry (
                        canvas.paper.width, canvas.paper.height
                    ),
                    wgl.material2
                );

                wgl.plane.doubleSided = true;
                wgl.scene.add (wgl.plane);

                // Clone of the canvas mesh for some RTT operations.
                wgl.plane_clone = new THREE.Mesh (
                    new THREE.PlaneGeometry (
                        canvas.paper.width, canvas.paper.height
                    ),
                    wgl.material2
                );

                // Accumulator shader material.
                wgl.material4 = new THREE.ShaderMaterial( {
                    uniforms: {
                        alphamap: {type: "t",  value: 0, texture: amap}, 
                        pass:     {type: "i",  value: 0}
                    },
                    attributes: wgl.attributes,
                    vertexShader: vert1,
                    fragmentShader: frag1,
                    transparent: true,
                    blending: THREE.AdditiveBlending,

                    depthTest: false,
                    depthWrite: false
                } );

                // Additive blending.
                wgl.material4.blendSrc = THREE.OneFactor;//SrcAlphaFactor
                wgl.material4.blendDst = THREE.OneFactor;

                // Stroke mesh to render onto the screen.
                var stroke = new THREE.Mesh (wgl.particles, wgl.material4);
                stroke.needsClear = false;
                stroke.doubleSided = true;
                stroke.position.y = 2;
                canvas.mouse.stroke = stroke;

                wgl.sceneRTT.add (stroke);
                wgl.stroke = stroke;

                // Effects shader material.
                wgl.material5 = new THREE.ShaderMaterial( {
                    uniforms: {
                        mask:        {type: "t",  value: 0, texture: rtt1},                         // Stroke mask.
                        ftransform:  {type: "m4", value: new THREE.Matrix4 ().identity ()},         // Fragments transform.
                        txmul:       {type: "v2", value: txmul},                                    // Texcoords transform.
                        shinea:      {type: "f",  value: 0.0},                                      // Shiny line intencity.
                        shineln:     {type: "v4", value: new THREE.Vector4 (0, 0, 0, 1)},           // Shiny line equation.
                        circle:      {type: "v4", value: new THREE.Vector4 (0.2, 0.2, 0.1, 0.3)}    // Circular indicator state.
                    },
                    vertexShader: vert0,
                    fragmentShader: frag2,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false
                } );

                // Effects plane mesh to render onto the screen.
                wgl.plane1 = new THREE.Mesh (
                    new THREE.PlaneGeometry (canvas.paper.width, canvas.paper.height),
                    wgl.material5
                );

                wgl.plane1.position = wgl.plane.position.clone ();
                wgl.plane1.position.y++;
                wgl.plane1.doubleSided = true;
                wgl.scene.add (wgl.plane1);
                
                // Edge-detection shader pass.
                wgl.darkedges.edgepass = new THREE.ShaderPass ({
                    fragmentShader: frag3,
                    vertexShader:   vert3,
                    uniforms:       {
                        tex:    {type: "t",  value: 0, texture: wgl.rtt_stroke},
                        pxmask: {type: "v4", value: new THREE.Vector4 (1.0, 0.0, 0.0, 0.0)},
                        kernel: {type: "fv", value: [-1.0, 0.0, +1.0, -2.0, 0.0, +2.0, -1.0, 0.0, +1.0]},
                        txstep: {type: "v2", value: new THREE.Vector2 (1.0 / canvas.paper.width, 1.0 / canvas.paper.height)},
                    }
                });

                //wgl.blurpass_x = new THREE.ShaderPass (THREE.ShaderExtras["horizontalBlur"], "tDiffuse");
                //wgl.blurpass_y = new THREE.ShaderPass (THREE.ShaderExtras["verticalBlur"],   "tDiffuse");
                
                wgl.darkedges.composer = new THREE.EffectComposer (wgl.renderer,
                    this.renderTarget (canvas.paper.width / 2, canvas.paper.height / 2,
                                       THREE.UnsignedByteType, THREE.RGBFormat));
                wgl.darkedges.composer.addPass (wgl.darkedges.edgepass);
                //wgl.composer_edge.addPass (wgl.blurpass_x);
                //wgl.composer_edge.addPass (wgl.blurpass_y);
                
                // Flow-map generation:
                // Value normalizer.
                wgl.flowmap.normpass = new THREE.ShaderPass ({
                    fragmentShader: frag4,
                    vertexShader:   vert3,
                    uniforms:       {
                        mapweights0: {type: "t",  value: 5, texture: wgl.rtt_acc1},         // Color map weights.
                        mapweights1: {type: "t",  value: 6, texture: wgl.rtt_acc2},         // Color map weights.
                    }
                });
                // Edge filter.
                wgl.flowmap.edgepass = new THREE.ShaderPass ({
                    fragmentShader: frag3,
                    vertexShader:   vert3,
                    uniforms:       {
                        tex:    {type: "t",  value: 0, texture: null},
                        pxmask: {type: "v4", value: new THREE.Vector4 (1.0, 0.0, 0.0, 0.0)},
                        kernel: {type: "fv", value: [-1.0, 0.0, +1.0, -2.0, 0.0, +2.0, -1.0, 0.0, +1.0]},
                        txstep: {type: "v2", value: new THREE.Vector2 (8.0 / canvas.paper.width, 8.0 / canvas.paper.height)},
                    }
                }, "tex");
                // Composer.
                wgl.flowmap.composer = new THREE.EffectComposer (wgl.renderer,
                    this.renderTarget (canvas.paper.width / 4, canvas.paper.height / 4,
                                       THREE.UnsignedByteType, THREE.RGBFormat));
                wgl.flowmap.composer.addPass (wgl.flowmap.normpass);
                wgl.flowmap.composer.addPass (wgl.flowmap.edgepass);

                // Tell the caller that we created something.
                return true;
            }

            return false;
        };

        this.initBlobMesh = function () {
            var cfg = canvas.config;
            if (cfg.shaders['frag_blob'] &&
                cfg.shaders['vert_blob'] &&
                cfg.paper_tex &&
                cfg.blob_tex &&
               !canvas.wgl.material3) {

                var norm = cfg.paper_tex;               // Paper normal map,
                var mask = cfg.blob_tex;                // Brush blob texture.
                var frag = cfg.shaders['frag_blob'];
                var vert = cfg.shaders['vert_blob'];

                var attributes = {
                    vcolor:     {type: 'c',  value: []}
                };

                // Init the stroke mesh attributes with some junk.
                var vc = attributes.vcolor.value
                var nv = 4;
                for (var i = 0; i < nv; i++) {
                    vc[i] = new THREE.Color (0xff0000);
                }

                attributes.vcolor.needsUpdate = true;

                // Texture dimentions.
                var txmul = new THREE.Vector2 (
                    1.0 / canvas.paper.width,
                    1.0 / canvas.paper.height
                );

                // Define the pointer material.
                canvas.wgl.material3 = new THREE.ShaderMaterial ({
                    uniforms: {
                        mask:       {type: "t", value: 0, texture: mask},                  // Blob mask.
                        papernorm:  {type: "t", value: 1, texture: norm},                  // Paper normal map.
                        txmul:      {type: "v2", value: txmul},                            // Texcoords transform.
                        txstep:     {type: "v2", value: new THREE.Vector2 (0.015625, 0.015625)},
                        jagged:     {type: "v2", value: new THREE.Vector2 (1.0, 0.9)},     // Stroke roughness.
                        bordersz:   {type: "v4", value: canvas.paper.border}
                    },
                    vertexShader: vert,
                    fragmentShader: frag,
                    attributes: attributes,
                    blending: THREE.AdditiveBlending,

                    depthTest: false,
                    depthWrite: false
                });

                // Init the brush object.
                canvas.brush = new window.Brush (canvas.wgl, function (brush) {
                    // Add the brush pointer to the scene.
                    canvas.wgl.scene.add (brush.pointer_mesh);
                    canvas.setInstrument ("brush");
                });

                // Tell the caller that we created something.
                return true;
            }

            return false;
        };
    };

    /**
     * Add the random offsets to all vertices.
     *
    function wgl_morphQuads (geom, d) {
        var v = geom.vertices;
        var f = geom.faces;
        var t = geom.faceVertexUvs[0];

        geom.computeBoundingBox ();
        var minx = geom.boundingBox.min.x;
        var maxx = geom.boundingBox.max.x;
        var minz = geom.boundingBox.min.z;
        var maxz = geom.boundingBox.max.z;

        // Morph vertices.
        for (var i = 0, ilen = v.length; i < ilen; i++) { 
            // Keep the edges in place.
            if (v[i].x > minx &&
                v[i].x < maxx &&
                v[i].z > minz &&
                v[i].z < maxz) {
                v[i].x += d * Math.random ();
                v[i].z += d * Math.random ();
            }
        }

        geom.computeBoundingBox ();
        var box = geom.boundingBox;
        var norm = new THREE.Vector3 (1.0, 0.0, 1.0).divideSelf (box.max.clone().subSelf (box.min));

        // Correct the texcoords.
        for (var i = 0, ilen = t.length; i < ilen; i++) { 
            var fi = f[i];
            var vA = v[fi.a];
            var vB = v[fi.b];
            var vC = v[fi.c];
            var vD = v[fi.d];
            var ti = t[i];
            ti[0].u = (vA.x - box.min.x) * norm.x;
            ti[0].v = (vA.z - box.min.z) * norm.z;
            ti[1].u = (vB.x - box.min.x) * norm.x;
            ti[1].v = (vB.z - box.min.z) * norm.z;
            ti[2].u = (vC.x - box.min.x) * norm.x;
            ti[2].v = (vC.z - box.min.z) * norm.z;
            ti[3].u = (vD.x - box.min.x) * norm.x;
            ti[3].v = (vD.z - box.min.z) * norm.z;
        }

        geom.__dirtyVertices = true;
    };
    */
}) (jQuery);
