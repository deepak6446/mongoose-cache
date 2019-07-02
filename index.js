/**
 * static functions and methods might not work as expected.
 * in find _id should be there
 */

/**
 * supported functions
 * 
 * find 
   Model.find()   
   Model.findById()
   Model.findOne()

   delete
   Model.deleteMany()
   Model.deleteOne()
   Model.findByIdAndDelete()
   Model.findByIdAndRemove()
   Model.findByIdAndUpdate()
   Model.findOneAndDelete()
   Model.findOneAndRemove()
   Model.findOneAndUpdate()
   Model.replaceOne()
   Model.updateMany()
   Model.updateOne()

 */
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const db = mongoose.connection

const redis = require("redis"),
    client = redis.createClient();

exports.cache = {
    init: init = (mongoose, client) => {

        this.orgMongooseModel = mongoose.model
        this.clientConnect = client
        this.supportedFunc = ['findOne', 'find']

        mongoose.model = (...args) => {
            let model = this.orgMongooseModel.apply(mongoose.model, args)

            this.supportedFunc.map((functionName) => {
                let orgFunction = model[functionName]
                model[functionName] = (...findArgs) => {
                    let [query, callback] = this.cache.getQueryCallBack(findArgs)
                    let key = this.cache.getKey(query, model.modelName, functionName)
                    mockCallBack = this.cache.storeInRedisAndCallBack(callback, key)

                    this.cache.findInCache(key, (error, data) => {
                        if (data) {
                            console.info(`return data from redis`)
                            return callback(null, data)
                        } else {
                            console.info(`return data from mongodb`)
                            findArgs[findArgs.length - 1] = mockCallBack
                            orgFunction.apply(model, findArgs)
                        }

                    })

                }
            })

            return model
        }

    },
    getQueryCallBack: getQueryCallBack = (findArgs) => {
        let query = findArgs.slice(0, -1)   // get all except last (callback)
        let callback = findArgs.slice(-1)[0]
        return [query, callback]
    },
    getKey: getKey = (query, modelName, functionName) => {
        let key = modelName + ":" + functionName;

        if (query && typeof (query) == 'string') {
            key = key + ":" + query
        } else {
            for (let i in query) {
                key = key + ":" + JSON.stringify(query[i])
            }
        }

        return key
    },
    findInCache: findInCache = (key, callback) => {
        this.clientConnect.get(key, (err, data) => {
            if (err) console.error(`error getting redis data: ${err}`)
            callback(null, data ? tryParse(data) : data)
        });
    },
    storeInRedisAndCallBack: storeInRedisAndCallBack = (callback, key) => {

        return (err, data) => {
            if (!err && (data || (Array.isArray(data) && data.length))) {
                storeInRedis(data, key)
                storeId(data, key)
            }
            callback(err, data)
        }

    },
    storeId: storeId = (data, key) => {
        if ((Array.isArray(data) && data.length)) {
            for (let i = 0; i < data.length; i++) {
                storeId(data[i], key)
            }
        } else {
            let _id = data._id
            if (!_id) {
                return console.error(`error in storing _id error: no _id found`)
            } else {
                try {
                    modelName = key.split(":")[0]
                    console.log("model_name:", modelName);
                    mapIdToKey(_id + ":" + modelName, key)
                } catch (error) { }
            }
        }
    },
    //store _id as _id:modelName to keep it unique across all collections
    mapIdToKey: mapIdToKey = (_id, key) => {
        this.clientConnect.set(_id, key)
    },
    storeInRedis: storeInRedis = (data, key) => {
        try { data = data.toJSON(); } catch (e) { }
        this.clientConnect.set(key, tryStringify(data))
    }
}

const tryParse = (string) => {
    try {
        let obj = JSON.parse(string);
        return obj;
    } catch (e) {
        return string;
    }
}

const tryStringify = (obj) => {
    try {
        let string = JSON.stringify(obj);
        return string;
    } catch (e) {
        return obj;
    }
}
exports.cache.init(mongoose, client)


mongoose.connect('mongodb://localhost:27017/redisCache', { useNewUrlParser: true });

var MyModel = mongoose.model('test', new Schema({ name: String }));

MyModel.create({ name: "deepak" }, function (error, result) {
    console.log("Create data Result: ", error, result)
    MyModel.findOne({}, { name: 1 }, function (error, result) {
        console.log("FindOne Result: ", error, result)
        MyModel.find({}, { name: 1 }, function (error, result) {
            // console.log("Find Result: ", error, result)
            MyModel.findById(, { name: 1 }, function (error, result) {
            });
        });
    });
