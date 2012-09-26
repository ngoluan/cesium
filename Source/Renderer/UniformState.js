/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/Ellipsoid',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/EncodedCartesian3',
        '../Core/BoundingRectangle'
    ], function(
        DeveloperError,
        defaultValue,
        Ellipsoid,
        Matrix3,
        Matrix4,
        Cartesian3,
        Cartesian4,
        EncodedCartesian3,
        BoundingRectangle) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias UniformState
     *
     * @internalConstructor
     */
    var UniformState = function(context) {
        this._viewport = new BoundingRectangle();
        this._viewportDirty = false;
        this._viewportOrthographicMatrix = Matrix4.IDENTITY.clone();
        this._viewportTransformation = Matrix4.IDENTITY.clone();

        this._model = Matrix4.IDENTITY.clone();
        this._view = Matrix4.IDENTITY.clone();
        this._projection = Matrix4.IDENTITY.clone();
        this._infiniteProjection = Matrix4.IDENTITY.clone();
        // Arbitrary.  The user will explicitly set this later.
        this._sunPosition = new Cartesian3(2.0 * Ellipsoid.WGS84.getRadii().x, 0.0, 0.0);

        // Derived members
        this._inverseModelDirty = true;
        this._inverseModel = new Matrix4();

        this._viewRotation = new Matrix3();
        this._inverseViewRotation = new Matrix3();

        this._inverseViewDirty = true;
        this._inverseView = new Matrix4();

        this._inverseProjectionDirty = true;
        this._inverseProjection = new Matrix4();

        this._modelViewDirty = true;
        this._modelView = new Matrix4();

        this._modelViewRelativeToEyeDirty = true;
        this._modelViewRelativeToEye = new Matrix4();

        this._inverseModelViewDirty = true;
        this._inverseModelView = new Matrix4();

        this._viewProjectionDirty = true;
        this._viewProjection = new Matrix4();

        this._modelViewProjectionDirty = true;
        this._modelViewProjection = new Matrix4();

        this._modelViewProjectionRelativeToEyeDirty = true;
        this._modelViewProjectionRelativeToEye = new Matrix4();

        this._modelViewInfiniteProjectionDirty = true;
        this._modelViewInfiniteProjection = new Matrix4();

        this._normalDirty = true;
        this._normal = new Matrix3();

        this._inverseNormalDirty = true;
        this._inverseNormal = new Matrix3();

        this._encodedCameraPositionMCDirty = true;
        this._encodedCameraPositionMC = new EncodedCartesian3();
        this._cameraPosition = new Cartesian3();

        this._sunDirectionECDirty = true;
        this._sunDirectionEC = new Cartesian3();

        this._sunDirectionWCDirty = true;
        this._sunDirectionWC = new Cartesian3();
    };

    function setView(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._view);
        Matrix4.getRotation(matrix, uniformState._viewRotation);

        uniformState._inverseViewDirty = true;
        uniformState._modelViewDirty = true;
        uniformState._modelViewRelativeToEyeDirty = true;
        uniformState._inverseModelViewDirty = true;
        uniformState._viewProjectionDirty = true;
        uniformState._modelViewProjectionDirty = true;
        uniformState._modelViewProjectionRelativeToEyeDirty = true;
        uniformState._modelViewInfiniteProjectionDirty = true;
        uniformState._normalDirty = true;
        uniformState._inverseNormalDirty = true;
        uniformState._sunDirectionECDirty = true;
    }

    function setProjection(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._projection);

        uniformState._inverseProjectionDirty = true;
        uniformState._viewProjectionDirty = true;
        uniformState._modelViewProjectionDirty = true;
        uniformState._modelViewProjectionRelativeToEyeDirty = true;
    }

    function setInfiniteProjection(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._infiniteProjection);

        uniformState._modelViewInfiniteProjectionDirty = true;
    }

    function setCameraPosition(uniformState, position) {
        Cartesian3.clone(position, uniformState._cameraPosition);
        uniformState._encodedCameraPositionMCDirty = true;
    }

    /**
     * Synchronizes the frustum's state with the uniform state.  This is called
     * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
     * are set to the right value.
     *
     * @memberof UniformState
     *
     * @param {Object} frustum The frustum to synchronize with.
     */
    UniformState.prototype.updateFrustum = function(frustum) {
        setProjection(this, frustum.getProjectionMatrix());
        if (frustum.getInfiniteProjectionMatrix) {
            setInfiniteProjection(this, frustum.getInfiniteProjectionMatrix());
        }
    };

    /**
     * Synchronizes the camera's state with the uniform state.  This is called
     * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
     * are set to the right value.
     *
     * @memberof UniformState
     *
     * @param {Camera} camera The camera to synchronize with.
     */
    UniformState.prototype.update = function(camera) {
        setView(this, camera.getViewMatrix());
        setCameraPosition(this, camera.position);

        this.updateFrustum(camera.frustum);
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {BoundingRectangle} viewport DOC_TBA.
     *
     * @see UniformState#getViewport
     * @see czm_viewport
     */
    UniformState.prototype.setViewport = function(viewport) {
        if (!BoundingRectangle.equals(viewport, this._viewport)) {
            BoundingRectangle.clone(viewport, this._viewport);
            this._viewportDirty = true;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * return {BoundingRectangle} DOC_TBA.
     *
     * @see UniformState#setViewport
     * @see czm_viewport
     */
    UniformState.prototype.getViewport = function () {
        return this._viewport;
    };

    function cleanViewport(uniformState) {
        if (uniformState._viewportDirty) {
            var v = uniformState._viewport;
            Matrix4.computeOrthographicOffCenter(v.x, v.x + v.width, v.y, v.y + v.height, 0.0, 1.0, uniformState._viewportOrthographicMatrix);
            Matrix4.computeViewportTransformation(v, 0.0, 1.0, uniformState._viewportTransformation);
            uniformState._viewportDirty = false;
        }
    }

    /**
     * DOC_TBA
     * @memberof UniformState
     *
     *
     * @see czm_viewportOrthographic
     */
    UniformState.prototype.getViewportOrthographic = function() {
        cleanViewport(this);
        return this._viewportOrthographicMatrix;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @see czm_viewportTransformation
     */
    UniformState.prototype.getViewportTransformation = function() {
        cleanViewport(this);
        return this._viewportTransformation;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} [matrix] DOC_TBA.
     *
     * @see UniformState#getModel
     * @see czm_model
     */
    UniformState.prototype.setModel = function(matrix) {
        Matrix4.clone(matrix, this._model);

        this._inverseModelDirty = true;
        this._modelViewDirty = true;
        this._modelViewRelativeToEyeDirty = true;
        this._inverseModelViewDirty = true;
        this._modelViewProjectionDirty = true;
        this._modelViewProjectionRelativeToEyeDirty = true;
        this._modelViewInfiniteProjectionDirty = true;
        this._normalDirty = true;
        this._inverseNormalDirty = true;
        this._encodedCameraPositionMCDirty = true;
        this._sunDirectionWCDirty = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setModel
     * @see czm_model
     */
    UniformState.prototype.getModel = function() {
        return this._model;
    };

    /**
     * Returns the inverse model matrix used to define the {@link czm_inverseModel} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The inverse model matrix.
     *
     * @see UniformState#setModel
     * @see UniformState#getModel
     * @see czm_inverseModel
     */
     UniformState.prototype.getInverseModel = function() {
         if (this._inverseModelDirty) {
             this._inverseModelDirty = true;

             // PERFORMANCE_IDEA: if the model matrix has scale, Matrix4.inverseTransformation would still work, right?
             this._model.inverse(this._inverseModel);
         }

         return this._inverseModel;
     };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setView
     * @see czm_view
     */
    UniformState.prototype.getView = function() {
        return this._view;
    };

    /**
     * Returns the 3x3 rotation matrix of the current view matrix ({@link UniformState#getView}).
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The 3x3 rotation matrix of the current view matrix.
     *
     * @see UniformState#getView
     * @see czm_viewRotation
     */
    UniformState.prototype.getViewRotation = function() {
        return this._viewRotation;
    };

    function cleanInverseView(uniformState) {
        if (uniformState._inverseViewDirty) {
            uniformState._inverseViewDirty = false;

            var v = uniformState.getView();
            Matrix4.inverse(v, uniformState._inverseView);
            Matrix4.getRotation(uniformState._inverseView, uniformState._inverseViewRotation);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_inverseView
     */
    UniformState.prototype.getInverseView = function() {
        cleanInverseView(this);
        return this._inverseView;
    };

    /**
     * Returns the 3x3 rotation matrix of the current inverse-view matrix ({@link UniformState#getInverseView}).
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The 3x3 rotation matrix of the current inverse-view matrix.
     *
     * @see UniformState#getInverseView
     * @see czm_inverseViewRotation
     */
    UniformState.prototype.getInverseViewRotation = function() {
        return this._inverseViewRotation;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setProjection
     * @see czm_projection
     */
    UniformState.prototype.getProjection = function() {
        return this._projection;
    };

    function cleanInverseProjection(uniformState) {
        if (uniformState._inverseProjectionDirty) {
            uniformState._inverseProjectionDirty = false;

            Matrix4.inverse(uniformState._projection, uniformState._inverseProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_inverseProjection
     */
    UniformState.prototype.getInverseProjection = function() {
        cleanInverseProjection(this);
        return this._inverseProjection;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setInfiniteProjection
     * @see czm_infiniteProjection
     */
    UniformState.prototype.getInfiniteProjection = function() {
        return this._infiniteProjection;
    };

    // Derived
    function cleanModelView(uniformState) {
        if (uniformState._modelViewDirty) {
            uniformState._modelViewDirty = false;

            Matrix4.multiply(uniformState._view, uniformState._model, uniformState._modelView);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_modelView
     */
    UniformState.prototype.getModelView = function() {
        cleanModelView(this);
        return this._modelView;
    };

    function cleanModelViewRelativeToEye(uniformState) {
        if (uniformState._modelViewRelativeToEyeDirty) {
            uniformState._modelViewRelativeToEyeDirty = false;

            var mv = uniformState.getModelView();
            var mvRte = uniformState._modelViewRelativeToEye;
            mvRte[0] = mv[0];
            mvRte[1] = mv[1];
            mvRte[2] = mv[2];
            mvRte[3] = mv[3];
            mvRte[4] = mv[4];
            mvRte[5] = mv[5];
            mvRte[6] = mv[6];
            mvRte[7] = mv[7];
            mvRte[8] = mv[8];
            mvRte[9] = mv[9];
            mvRte[10] = mv[10];
            mvRte[11] = mv[11];
            mvRte[12] = 0.0;
            mvRte[13] = 0.0;
            mvRte[14] = 0.0;
            mvRte[15] = mv[15];
        }
    }

    /**
     * Returns the model-view relative to eye matrix used to define the {@link czm_modelViewRelativeToEye} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The model-view relative to eye matrix.
     *
     * @see czm_modelViewRelativeToEye
     */
    UniformState.prototype.getModelViewRelativeToEye = function() {
        cleanModelViewRelativeToEye(this);
        return this._modelViewRelativeToEye;
    };

    function cleanInverseModelView(uniformState) {
        if (uniformState._inverseModelViewDirty) {
            uniformState._inverseModelViewDirty = false;

            Matrix4.inverse(uniformState.getModelView(), uniformState._inverseModelView);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_inverseModelView
     */
    UniformState.prototype.getInverseModelView = function() {
        cleanInverseModelView(this);
        return this._inverseModelView;
    };

    function cleanViewProjection(uniformState) {
        if (uniformState._viewProjectionDirty) {
            uniformState._viewProjectionDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState._view, uniformState._viewProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_viewProjection
     */
    UniformState.prototype.getViewProjection = function() {
        cleanViewProjection(this);
        return this._viewProjection;
    };

    function cleanModelViewProjection(uniformState) {
        if (uniformState._modelViewProjectionDirty) {
            uniformState._modelViewProjectionDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState.getModelView(), uniformState._modelViewProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_modelViewProjection
     */
    UniformState.prototype.getModelViewProjection = function() {
        cleanModelViewProjection(this);
        return this._modelViewProjection;
    };

    function cleanModelViewProjectionRelativeToEye(uniformState) {
        if (uniformState._modelViewProjectionRelativeToEyeDirty) {
            uniformState._modelViewProjectionRelativeToEyeDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState.getModelViewRelativeToEye(), uniformState._modelViewProjectionRelativeToEye);
        }
    }

    /**
     * Returns the model-view-projection relative to eye matrix used to define the {@link czm_modelViewProjectionRelativeToEye} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The model-view-projection relative to eye matrix.
     *
     * @see czm_modelViewProjectionRelativeToEye
     */
    UniformState.prototype.getModelViewProjectionRelativeToEye = function() {
        cleanModelViewProjectionRelativeToEye(this);
        return this._modelViewProjectionRelativeToEye;
    };

    function cleanModelViewInfiniteProjection(uniformState) {
        if (uniformState._modelViewInfiniteProjectionDirty) {
            uniformState._modelViewInfiniteProjectionDirty = false;

            Matrix4.multiply(uniformState._infiniteProjection, uniformState.getModelView(), uniformState._modelViewInfiniteProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_modelViewProjection
     */
    UniformState.prototype.getModelViewInfiniteProjection = function() {
        cleanModelViewInfiniteProjection(this);
        return this._modelViewInfiniteProjection;
    };

    var normalScratch = new Matrix4();

    function cleanNormal(uniformState) {
        if (uniformState._normalDirty) {
            uniformState._normalDirty = false;

            // TODO:  Inverse, transpose of the whole 4x4?  Or we can just do the 3x3?
            Matrix4.inverse(uniformState.getModelView(), normalScratch);
            Matrix4.transpose(normalScratch, normalScratch);
            Matrix4.getRotation(normalScratch, uniformState._normal);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix3} DOC_TBA.
     *
     * @see czm_normal
     */
    UniformState.prototype.getNormal = function() {
        cleanNormal(this);
        return this._normal;
    };

    var inverseNormalScratch = new Matrix4();

    function cleanInverseNormal(uniformState) {
        if (uniformState._inverseNormalDirty) {
            uniformState._inverseNormalDirty = false;

            // TODO:  Inverse of the whole 4x4?  Or we can just do the 3x3?
            Matrix4.inverse(uniformState.getModelView(), inverseNormalScratch);
            Matrix4.getRotation(inverseNormalScratch, uniformState._inverseNormal);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix3} DOC_TBA.
     *
     * @see czm_inverseNormal
     */
    UniformState.prototype.getInverseNormal = function() {
        cleanInverseNormal(this);
        return this._inverseNormal;
    };

    var sunPositionScratch = new Cartesian3();

    function cleanSunDirectionEC(uniformState) {
        if (uniformState._sunDirectionECDirty) {
            uniformState._sunDirectionECDirty = false;

            Matrix3.multiplyByVector(uniformState.getViewRotation(), uniformState._sunPosition, sunPositionScratch);
            Cartesian3.normalize(sunPositionScratch, uniformState._sunDirectionEC);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} sunPosition The position of the sun in the sun's reference frame.
     *
     * @exception {DeveloperError} sunPosition is required.
     *
     * @see UniformState#getSunPosition
     */
    UniformState.prototype.setSunPosition = function(sunPosition) {
        if (!sunPosition) {
            throw new DeveloperError('sunPosition is required.');
        }

        Cartesian3.clone(sunPosition, this._sunPosition);
        this._sunDirectionECDirty = true;
        this._sunDirectionWCDirty = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @see UniformState#setSunPosition
     */
    UniformState.prototype.getSunPosition = function() {
        return this._sunPosition;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} The sun's direction in eye coordinates.
     *
     * @see czm_sunDirectionEC
     * @see UniformState#getSunDirectionEC
     */
    UniformState.prototype.getSunDirectionEC = function() {
        cleanSunDirectionEC(this);
        return this._sunDirectionEC;
    };

    function cleanSunDirectionWC(uniformState) {
        if (uniformState._sunDirectionWCDirty) {
            uniformState._sunDirectionWCDirty = false;
            Cartesian3.normalize(uniformState._sunPosition, uniformState._sunDirectionWC);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} A normalized vector from the model's origin to the sun in model coordinates.
     *
     * @see czm_sunDirectionWC
     */
    UniformState.prototype.getSunDirectionWC = function() {
        cleanSunDirectionWC(this);
        return this._sunDirectionWC;
    };

    var cameraPositionMC = new Cartesian3();

    function cleanEncodedCameraPositionMC(uniformState) {
        if (uniformState._encodedCameraPositionMCDirty) {
            uniformState._encodedCameraPositionMCDirty = false;

            uniformState.getInverseModel().multiplyByPoint(uniformState._cameraPosition, cameraPositionMC);
            EncodedCartesian3.fromCartesian(cameraPositionMC, uniformState._encodedCameraPositionMC);
        }
    }

    /**
     * Returns the high bits of the camera position used to define the {@link czm_encodedCameraPositionMCHigh} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} The high bits of the camera position.
     *
     * @see UniformState#getEncodedCameraPositionMCLow
     */
    UniformState.prototype.getEncodedCameraPositionMCHigh = function() {
        cleanEncodedCameraPositionMC(this);
        return this._encodedCameraPositionMC.high;
    };

    /**
     * Returns the low bits of the camera position used to define the {@link czm_encodedCameraPositionMCLow} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} The low bits of the camera position.
     *
     * @see UniformState#getEncodedCameraPositionMCHigh
     */
    UniformState.prototype.getEncodedCameraPositionMCLow = function() {
        cleanEncodedCameraPositionMC(this);
        return this._encodedCameraPositionMC.low;
    };

    UniformState.prototype.getHighResolutionSnapScale = function() {
        return 1.0;
    };

    return UniformState;
});