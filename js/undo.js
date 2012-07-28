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
    function cloneParticle (p, dest) {
        if (!dest) {
            dest = {};
        };
        
        return {
                position:   new THREE.Vector3 (),
                last_position: new THREE.Vector3 (),
                pigment:    new THREE.Vector4 (),                           // Pigment description (shader attribute).
                transform:  new THREE.Vector4 (),                           // Particle position and radius (shader attribute).
                rotation:   new THREE.Vector3 (),                           // Particle rotation (debug).
                v:          new THREE.Vector2 (),                           // Velocity.
                F:          new THREE.Vector2 (),                           // Force.
                norm:       new THREE.Vector2 (),                           // Surface normal.
                color:      new THREE.Color (),                             // Particle color.
                //radius:     0,                                              // Particle radius.
                //radius2:    0,                                              // Squared value.
                radius_max: 0,                                              //
              //mass:       0,                                              // Particle mass.
                is_pylon:   false,                                          // Is the particle a pylon?
                pylon:      undefined,                                      // Closest pylon.
                id:         0,                                              // Unique particle
        };
    };
    
    var CanvasState = function () {
        var particles  = undefined;
        var background = undefined;
        
        /// Save the current list of particles into the state.
        this.saveParticles (pts) {
            particles = [];
            for (var i = 0, len = pts.length; i < len; i++) {
                particles.push (pts[i].clone ());
            }
        };
        
        /// Restore the list of particles.
        this.restoreParticles (pts) {
            if (particles) {
                // For each particles state...
                for (var i = 0, ilen = particles.length; i < ilen; i++) {
                    var pi = particles[i];
                    
                    // ...
                }
            }
        };
    };

}) (jQuery);
