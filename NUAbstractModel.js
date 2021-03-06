import NUAttribute from './NUAttribute';
import NUObject from './NUObject';

/*
  This class models the base Entity
*/
export default class NUAbstractModel extends NUObject {

    constructor() {
        super();
        this._validationErrors = new Map();
        this._validators = new Map();
        this.registerAttributeValidators();
    }

    /*
        Populates individual properties of 'this' Entity object from the JSON object received
    */
    buildFromJSON(JSONObject) {
        const attributeDescriptors = this.constructor.attributeDescriptors;
        Object.entries(attributeDescriptors).forEach(([localName, attributeObj]) => {
            if (attributeObj.remoteName in JSONObject) {
                const value = JSONObject[attributeObj.remoteName];
                if (attributeObj.attributeType === NUAttribute.ATTR_TYPE_INTEGER || attributeObj.attributeType === NUAttribute.ATTR_TYPE_FLOAT) {
                    this[localName] = (!value && value !== 0) ? null : Number(value);
                } else if (attributeObj.attributeType === NUAttribute.ATTR_TYPE_OBJECT && attributeObj.subType && value) {
                    const subtypeEntity = new attributeObj.subType();
                    this[localName] = subtypeEntity.buildFromJSON(value);
                } else {
                    this[localName] = value;
                }
            }
        });
        return this;
    }

    /*
        Return JSON representation of 'this' object
    */
    buildJSON() {
        return JSON.stringify(this.toObject());
    }

    toString() {
        return this.buildJSON();
    }

    toObject() {
        const attributeDescriptors = this.constructor.attributeDescriptors;
        const obj =  {};
        Object.entries(attributeDescriptors).forEach(([localName, attributeObj]) => {
            let value = this[localName];
            if (value) {
                if (attributeObj.attributeType === NUAttribute.ATTR_TYPE_OBJECT && attributeObj.subType) {
                    value = value.toObject();
                } else if (attributeObj.attributeType === NUAttribute.ATTR_TYPE_ENUM && typeof value === 'object') {
                    value = value.name;
                }
            }
            obj[attributeObj.remoteName] = value;
        });
        return obj;
    }

    /*
        Register each NUAttribute as validator
    */
    registerAttributeValidators() {
        Object.values(this.constructor.attributeDescriptors).forEach((attributeObj) => {
            this._validators.set(attributeObj.name, attributeObj);
        });
    }

    /*
        Register custom validator
    */
    registerValidator(...args) {
        this._validators.set(args[0].name, args[0]);
    }

    isValid(formValues) {
        this.validationErrors.clear();
        this.checkErrors(formValues);
        return (this.validationErrors.size === 0);
    }

    checkErrors(formValues) {
        const entity = this;
        entity._validators.forEach((validator, attributeName) => {
            const attrObj = this.constructor.attributeDescriptors[attributeName];
            const validationError = validator.validate(entity, attrObj, formValues);
            if (validationError) {
                entity.validationErrors.set(validator.name, validationError);
            }
        });
    }

    getDefaults() {
        return Object.entries(this).reduce((acc, [key, value]) => {
            return (value && key !== '_validationErrors' && key !== '_validators')
                ? { ...acc, [key.substring(1)]: value } : acc;
        }, {});
    }
}
