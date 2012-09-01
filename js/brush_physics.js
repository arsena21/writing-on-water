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

define (function () {
    /**
     * Brush pointer generator.
     * @constructor
     */
    return function (utils) {
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
    }
});
