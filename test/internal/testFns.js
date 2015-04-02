﻿// Uncomment these lines to run against base + individual plugins.
//define(["breeze.base",
//        "breeze.ajax.jQuery",
//        "breeze.modelLibrary.ko", "breeze.modelLibrary.backbone", "breeze.modelLibrary.backingStore",
//        "breeze.dataService.webApi", "breeze.dataService.odata"
//    ], function (breeze) {


// Uncomment this line to run against base + individual plugins (minified)
// define(["breeze.min"], function(breeze) {

// Uncomment this to run against a version of base and all plugins
breezeTestFns = (function (breeze) {

  "use strict";

  var core = breeze.core;

  var MetadataStore = breeze.MetadataStore;
  var EntityManager = breeze.EntityManager;
  var EntityQuery = breeze.EntityQuery;
  var NamingConvention = breeze.NamingConvention;
  var DataType = breeze.DataType;
  var AutoGeneratedKeyType = breeze.AutoGeneratedKeyType;
  var Validator = breeze.Validator;

  var testFns = {
    inheritancePurge: inheritancePurge, // empty the Inheritance Model db completely
    inheritanceReset: inheritanceReset, // reset to known state
    inheritanceServiceName: "breeze/inheritance",
    teardown_inheritanceReset: teardown_inheritanceReset
  };

  testFns.testIfNot = function(testName, delimString, msg, fn) {
    var tokens = delimString.split(",").map(function(s) {
      return s.trim().toLowerCase();
    });
    var skipMsg = _.find(tokens, function(t) {
      return getSkipMsg(t) != null;
    });

    if (skipMsg) {
      return QUnit.skip("[" + skipMsg + " " + msg + "]: " + testName, fn);
    } else {
      return test(testName, fn);
    }
  }

  function getSkipMsg(s) {
    if ((testFns.DEBUG_MONGO && s.indexof("mongo",0) === 0) ||
       (testFns.DEBUG_SEQUELIZE && s.indexof("sequel",0) === 0) ||
       (testFns.DEBUG_NHIBERNATE && s.indexof("nhib",0) === 0) ||
       (testFns.DEBUG_HIBERNATE && s.indexof("hib",0) == 0) ||
       (testFns.DEBUG_ODATA && s.indexof("odata", 0) === 0) ||
       (testFns.DEBUG_EF_CODEFIRST && s.indexof("efcodefirst", 0) === 0)
      ) {
      return s;
    } else {
      return null;
    }
  }

  

  testFns.TEST_RECOMPOSITION = true;
  configQunit();

  function configQunit() {
    
    QUnit.config.autostart = false;
    // global timeout of 20 secs
    // No test should take that long but first time db build can.
    QUnit.config.testTimeout = 20000;

    QUnit.config.urlConfig.push({
      id: "next",
      label: "Next tracking lib.",
      tooltip: "Next tracking lib."
    });

    QUnit.config.urlConfig.push({
      id: "canStart",
      label: "Start the tests",
      tooltip: "Allows a user to set options before tests start."
    });


    if (!QUnit.urlParams.canStart) {
      // insures that no tests run.
      QUnit.config.testId = ["none"];
      // Doesn't actually work.
      // QUnit.config.moduleFilter = "none";
    }
    

    // QUnit.start();
  
  }



  function updateTitle() {
    testFns.title = "server: " + testFns.serverVersion + ", dataService: " + (testFns.dataService || "--NONE SPECIFIED --") + ", modelLibrary: " + testFns.modelLibrary;
    var maintitle = "Breeze Test Suite -> " + testFns.title;
    var el = document.getElementById("title");
    if (el) el.innerHTML = maintitle;
    el = document.getElementById("qunit-header");
    if (el) el.innerHTML = maintitle;
  }

  testFns.setSampleNamespace = function (value) {
    testFns.sampleNamespace = value;
  };

  testFns.queryServerVersion = function (url) {
    url = url || "/testconfig";
    var ajaxImpl = core.config.getAdapterInstance("ajax");
    
    ajaxImpl.ajax({
      type: "GET",
      url: url,
      dataType: 'json',
      success: function (httpResponse) {
        var data = httpResponse.data;
        testFns.setServerVersion(data.value, data.version);
        testFns.northwindIBMetadata = JSON.parse(data.metadata);
        QUnit.start();
          
      },
      error: function (httpResponse) {
        alert("error getting server version data: " + httpResponse.status);
      }
    });
    
  }

  testFns.setServerVersion = function (value, version) {
    value = value.toLowerCase();
    version = (version || "").toLowerCase();
    testFns.serverVersion = value + '/' + version;

    testFns.DEBUG_NHIBERNATE = version === "nhibernate";
    testFns.DEBUG_EF_CODEFIRST = version === "codefirst_provider";
    testFns.DEBUG_EF_DBFIRST = version === "databasefirst_new";
    testFns.DEBUG_EF_DBFIRST_OLD = version === "databasefirst_old";
    testFns.DEBUG_EF_ORACLE = version === "oracle_edmx";

    updateTitle();
  }

  testFns.setDataService = function (value, version) {
    value = value.toLowerCase();
    version = (version || "").toLowerCase();
    testFns.DEBUG_WEBAPI = value === "webapi";
    testFns.DEBUG_ODATA = value === "odata" || value === "odata4";
    testFns.DEBUG_MONGO = value === "mongo";
    testFns.DEBUG_SEQUELIZE = value === "sequelize";
    testFns.DEBUG_HIBERNATE = value == "hibernate";
    testFns.DEBUG_ODATA_VERSION = version || "wcf";
    if (testFns.DEBUG_WEBAPI) {
      testFns.dataService = core.config.initializeAdapterInstance("dataService", "webApi").name;

      if (testFns.TEST_RECOMPOSITION) {
        var oldAjaxCtor = core.config.getAdapter("ajax");
        var newAjaxCtor = function () {
          this.name = "newAjax";
          this.defaultSettings = {
            headers: { "X-Test-Header": "foo1" },
            beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader("X-Test-Before-Send-Header", "foo1");
            }
          };
        };
        newAjaxCtor.prototype = new oldAjaxCtor();
        core.config.registerAdapter("ajax", newAjaxCtor);
        core.config.initializeAdapterInstance("ajax", "newAjax", true);
      } else {
        var ajaxImpl = core.config.getAdapterInstance("ajax");
        ajaxImpl.defaultSettings = {
          headers: { "X-Test-Header": "foo2" },
          beforeSend: function (jqXHR, settings) {
            jqXHR.setRequestHeader("X-Test-Before-Send-Header", "foo2");
          }
        };
      }
      // test recomposition
      testFns.defaultServiceName = "breeze/NorthwindIBModel";

    } else if (testFns.DEBUG_ODATA) {
      if (testFns.DEBUG_ODATA_VERSION == "wcf") {
        testFns.dataService = core.config.initializeAdapterInstance("dataService", "OData").name;
        testFns.defaultServiceName = "http://localhost:9009/ODataService.svc";
      } else if (testFns.DEBUG_ODATA_VERSION == "webapi2" && value == "odata") {
        testFns.dataService = core.config.initializeAdapterInstance("dataService", "webApiOData").name;
        testFns.defaultServiceName = "http://localhost:9011/NorthwindIB_odata";
      } else if (testFns.DEBUG_ODATA_VERSION == "webapi2" && value == "odata4") {
        testFns.dataService = core.config.initializeAdapterInstance("dataService", "webApiOData4").name;
        testFns.defaultServiceName = "http://localhost:9017/NorthwindIB_odata";
      }
    } else if (testFns.DEBUG_MONGO) {
      testFns.dataService = core.config.initializeAdapterInstance("dataService", "mongo").name;
      testFns.defaultServiceName = "breeze/NorthwindIBModel";
    } else if (testFns.DEBUG_SEQUELIZE) {
      testFns.dataService = core.config.initializeAdapterInstance("dataService", "webApi").name;
      testFns.uriBuilder = core.config.initializeAdapterInstance("uriBuilder", "json").name;
      testFns.defaultServiceName = "breeze/NorthwindIBModel";
    } else if (testFns.DEBUG_HIBERNATE) {
      testFns.dataService = core.config.initializeAdapterInstance("dataService", "webApi").name;
      testFns.uriBuilder = core.config.initializeAdapterInstance("uriBuilder", "json").name;
      testFns.defaultServiceName = "http://localhost:8080/breeze-webtest/northwind"

    }
    updateTitle();
    setWellKnownData();
  };


  function setWellKnownData() {
    var wellKnownData;
    if (testFns.DEBUG_MONGO) {
      wellKnownData = {
        // nancyID: "51a6d50e1711572dcc8ce7d1",
        chaiProductID: 10001,
        dummyOrderID: "50a6d50e1711572dcc8ce7d1",
        dummyEmployeeID: "50a6d50e1711572dcc8ce7d2"
      }
      testFns.orderKeyName = "_id";
      testFns.customerKeyName = "_id";
      testFns.employeeKeyName = "_id";
      testFns.productKeyName = "_id";
      testFns.userKeyName = "_id";
      testFns.supplierKeyName = "_id";
      testFns.regionKeyName = "_id";
    } else {
      wellKnownData = {
        nancyID: 1,
        dummyOrderID: 999,
        dummyEmployeeID: 9999,
        chaiProductID: 1,
        alfredsOrderDetailKey: { OrderID: 10643, ProductID: 28 /*R�ssle Sauerkraut*/ }
      }
      testFns.orderKeyName = "orderID";
      testFns.customerKeyName = "customerID";
      testFns.employeeKeyName = "employeeID";
      testFns.productKeyName = "productID";
      testFns.supplierKeyName = "supplierID";
      testFns.userKeyName = "id";
      testFns.regionKeyName = "regionID";
    }
    wellKnownData.alfredsID = '785efa04-cbf2-4dd7-a7de-083ee17b6ad2';

    testFns.wellKnownData = wellKnownData;


  }

  function updateWellKnownData() {
    if (testFns.wellKnownData.nancyID) return;
    var em = testFns.newEm();
    stop();
    breeze.EntityQuery.from("Employees").where("lastName", "startsWith", "Davo")
        .using(em).execute().then(function (data) {
          var nancy = data.results[0];
          testFns.wellKnownData.nancyID = nancy.getProperty(testFns.employeeKeyName);
        }).fail(testFns.handleFail).fin(start);
  };

  testFns.configure = function () {

    var modelLibrary = window.localStorage.getItem("modelLibrary") || "ko";
    var oldNext = !!window.localStorage.getItem("qunit.next");

    var curNext = !!QUnit.urlParams.next;

    if (curNext) {
      window.localStorage.setItem("qunit.next", true);
    } else {
      window.localStorage.removeItem("qunit.next");
    }
    var doNext = oldNext != curNext;
    if (doNext) {
      if (modelLibrary === "ko") {
        modelLibrary = "backbone";
      } else if (modelLibrary === "backbone") {
        modelLibrary = "backingStore";
      } else {
        modelLibrary = "ko";
      }
    }
    var ajaxLibrary = modelLibrary === "backingStore" ? "angular" : "jQuery";
    window.localStorage.setItem("modelLibrary", modelLibrary);
    core.config.initializeAdapterInstance("modelLibrary", modelLibrary, true);
    testFns.modelLibrary = core.config.getAdapterInstance("modelLibrary").name;
    core.config.initializeAdapterInstance("ajax", ajaxLibrary, true);
    updateTitle();
  };

  testFns.setup = function (config) {
    config = config || {};
    // config.serviceName - default = testFns.defaultServiceName
    // config.serviceHasMetadata - default = true
    // config.metadataFn - default = null
    var serviceHasMetadata = (config.serviceHasMetadata === undefined) ? true : false;
    if (config.serviceName == null || config.serviceName.length === 0) {
      if (testFns.serviceName != testFns.defaultServiceName) {
        testFns.serviceName = testFns.defaultServiceName;
        testFns.metadataStore = null;
      }
    } else {
      if (testFns.serviceName !== config.serviceName) {
        testFns.serviceName = config.serviceName;
        testFns.metadataStore = null;
      }
    }

    if (config.noMetadata) return;

    if (!testFns.metadataStore) {
      testFns.metadataStore = testFns.newMs();
    }

    updateWellKnownData();

    if (!testFns.metadataStore.isEmpty()) {
      if (config.metadataFn) config.metadataFn();
      return;
    }


    var em = testFns.newEm();
    if (serviceHasMetadata) {
      stop();
      em.fetchMetadata(function (rawMetadata) {
        // testFns.configureMetadata();
        if (config.metadataFn) config.metadataFn();

      }).fail(testFns.handleFail).fin(start);
    }
  };

  testFns.configureMetadata = function (metadataFetchedArgs) {
    var ms = metadataFetchedArgs.metadataStore;
    var dataService = metadataFetchedArgs.dataService;

    if (testFns.DEBUG_ODATA) {
      if (testFns.DEBUG_ODATA_VERSION == 'webapi2') {
        var entityType, complexType, np, dp;

        entityType = ms.getEntityType("Customer");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
        dp = entityType.getDataProperty("companyName");
        dp.validators.push(Validator.maxLength({ maxLength: 40 }));

        entityType = ms.getEntityType("Employee");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
        np = entityType.getNavigationProperty("manager"); // inv: employee.directReports
        np.setProperties({ foreignKeyNames: ["reportsToEmployeeID"], inverse: "directReports" });
        dp = entityType.getDataProperty("lastName");
        dp.validators.push(Validator.maxLength({ maxLength: 30 }));


        entityType = ms.getEntityType("Order");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
        np = entityType.getNavigationProperty("customer"); // inv: customer.orders
        np.setProperties({ foreignKeyNames: ["customerID"] });
        np.setInverse("orders");
        np = entityType.getNavigationProperty("employee"); // inv: employee.orders
        np.setProperties({ foreignKeyNames: ["employeeID"], inverse: "orders" });

        entityType = ms.getEntityType("InternationalOrder");
        np = entityType.getNavigationProperty("order");
        np.setProperties({ foreignKeyNames: ["orderID"], inverse: "internationalOrder" });

        entityType = ms.getEntityType("OrderDetail");
        np = entityType.getNavigationProperty("order"); // inv: order.orderDetails
        np.setProperties({ foreignKeyNames: ["orderID"], inverse: "orderDetails" });
        np = entityType.getNavigationProperty("product"); // inv: [none]
        np.setProperties({ foreignKeyNames: ["productID"] });

        entityType = ms.getEntityType("Product");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        entityType = ms.getEntityType("Category");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        entityType = ms.getEntityType("Supplier");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
        dp = entityType.getDataProperty("companyName");
        dp.validators.push(Validator.maxLength({ maxLength: 30 }));

        entityType = ms.getEntityType("Role");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        entityType = ms.getEntityType("User");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        entityType = ms.getEntityType("UserRole");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        entityType = ms.getEntityType("TimeLimit");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        entityType = ms.getEntityType("TimeGroup");
        entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        //entityType = ms.getEntityType("Geospatial");
        //entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        //entityType = ms.getEntityType("UnusualDate");
        //entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

        complexType = ms.getEntityType("Location");
        dp = complexType.getProperty("city");
        dp.validators.push(Validator.maxLength({ maxLength: 15 }));


      } else if (testFns.DEBUG_ODATA_VERSION == "wcf") {
        if (dataService.serviceName.indexOf("Inheritance") === -1) {
          var regionType = ms.getEntityType("Region");
          regionType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.KeyGenerator });

          setIdentityProp(ms, "Product");
          setIdentityProp(ms, "Category");
          setIdentityProp(ms, "Employee");
          //setIdentityProp(ms, "EmployeeTerritory");
          setIdentityProp(ms, "Customer");
          setIdentityProp(ms, "Order");
          setIdentityProp(ms, "Role");
          setIdentityProp(ms, "Supplier");
          setIdentityProp(ms, "User");
          setIdentityProp(ms, "UserRole");

        }
      }
    }
  };

  testFns.setIdentityProp = setIdentityProp;

  function setIdentityProp(metadataStore, typeName) {
    try {
      var type = metadataStore.getEntityType(typeName);
      type.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
    } catch (e) {

    }
  }

  testFns.newMs = function () {
    if (!testFns.DEBUG_HIBERNATE) {
      var namingConv = new NamingConvention({
        name: "camelCase2",
        serverPropertyNameToClient: function (serverPropertyName, prop) {
          if (prop && prop.isDataProperty && prop.dataType === DataType.Boolean) {
            return "is" + serverPropertyName;
          } else {
            return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
          }
        },
        clientPropertyNameToServer: function (clientPropertyName, prop) {
          if (prop && prop.isDataProperty && prop.dataType === DataType.Boolean) {
            return clientPropertyName.substr(2);
          } else {
            return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
          }
        }
      });
      var altNamingConv = NamingConvention.camelCase;
      namingConv.setAsDefault();
    }
    // var ms = new MetadataStore({ namingConvention: namingConv });
    var ms = new MetadataStore();
    ms.metadataFetched.subscribe(testFns.configureMetadata);
    return ms;
  };

  testFns.newEm = function (metadataStore) {
    if (metadataStore) {
      return new EntityManager({ serviceName: testFns.serviceName, metadataStore: metadataStore });
    } else {
      if (!testFns.metadataStore) {
        testFns.metadataStore = testFns.newMs();
      }
      return new EntityManager({ serviceName: testFns.serviceName, metadataStore: testFns.metadataStore });
    }
  };

  testFns.newEmX = function () {
    return testFns.newEm(MetadataStore.importMetadata(testFns.metadataStore.exportMetadata()));
  };

  testFns.handleFail = function (error) {
    if (!error) {
      ok(false, "unknown error");
      // start();
      return;
    }
    if (error.handled === true) return;

    if (error instanceof (Error)) {
      var msg = error.message || "";
      if (msg.indexOf("assertion outside test context") >= 0) {
        alert(msg);
      }
      msg = msg + ((error.responseText && " responseText: " + error.responseText) || "");
      ok(false, "Failed: " + msg);
    } else {
      ok(false, "error is not an error object; error.status: " + error.status + "  error.message: " + error.message + "-" + error.responseText);
    }
    return;
  };

  testFns.getDups = function (items) {
    var uniqueItems = [];
    var dups = [];
    items.forEach(function (item) {
      if (uniqueItems.indexOf(item) === -1) {
        uniqueItems.push(item);
      } else {
        dups.push(item);
      }
    });
    return dups;
  };

  testFns.morphStringProp = function (entity, propName) {
    var val = entity.getProperty(propName);
    var newVal = testFns.morphString(val);
    entity.setProperty(propName, newVal);
    return newVal;
  };

  testFns.morphString = function (str) {
    if (!str) {
      return "_X";
    }
    if (str.length > 1 && (core.stringEndsWith(str, "_X") || core.stringEndsWith(str, "__"))) {
      return str.substr(0, str.length - 2);
    } else {
      return str + "_X";
    }
  };

  testFns.removeAccents = function (s) {
    var r = s.toLowerCase();
    r = r.replace(new RegExp(/[àáâãäå]/g), "a");
    r = r.replace(new RegExp(/æ/g), "ae");
    r = r.replace(new RegExp(/ç/g), "c");
    r = r.replace(new RegExp(/[èéêë]/g), "e");
    r = r.replace(new RegExp(/[ìíîï]/g), "i");
    r = r.replace(new RegExp(/ñ/g), "n");
    r = r.replace(new RegExp(/[òóôõö]/g), "o");
    r = r.replace(new RegExp(/œ/g), "oe");
    r = r.replace(new RegExp(/[ùúûü]/g), "u");
    r = r.replace(new RegExp(/[ýÿ]/g), "y");
    return r;
  };

  testFns.assertIsSorted = function (collection, propertyName, dataType, isDescending, isCaseSensitive) {
    var extractFn = null;
    if (propertyName) {
      extractFn = function (obj) { return obj && obj.getProperty(propertyName); }
    }
    isCaseSensitive = isCaseSensitive == null ? true : isCaseSensitive;
    var compareFn = function (a, b) {
      // localeCompare has issues in Chrome.
      // var compareResult = a[propertyName].localeCompare(b.propertyName);
      return compare(a, b, extractFn, dataType, isDescending, isCaseSensitive);
    };
    var isOk = assertIsSorted(collection, compareFn);
    if (propertyName) {
      ok(isOk, propertyName + " not sorted correctly");
    } else {
      ok(isOk, "collection not sorted correctly");
    }
    return isOk;
  };

  function assertIsSorted(collection, compareFn) {
    var firstTime = true;
    var prevItem;
    var isOk = collection.every(function (item) {
      if (firstTime) {
        firstTime = false;
      } else {
        var r = compareFn(prevItem, item);
        if (r > 0) {
          return false;
        }
      }
      prevItem = item;
      return true;
    });
    return isOk;
  }

  testFns.haveSameContents = function (a1, a2) {
    var areBothArrays = Array.isArray(a1) && Array.isArray(a2);
    if (!areBothArrays) return false;
    if (a1.length !== a2.length) return false;
    return a1.every(function (v) {
      return a2.indexOf(v) >= 0;
    });
  }

  function compareByProperty(a, b, propertyName, dataType, isDescending, isCaseSensitive) {
    var value1 = a && a.getProperty(propertyName);
    var value2 = b && b.getProperty(propertyName);
    return compare(value1, value2, dataType, isDescending, isCaseSensitive);
  }

  function compare(a, b, extractValueFn, dataType, isDescending, isCaseSensitive) {
    extractValueFn = extractValueFn || function (x) { return x; }
    var value1 = extractValueFn(a);
    var value2 = extractValueFn(b);
    value1 = value1 === undefined ? null : value1;
    value2 = value2 === undefined ? null : value2;
    if (dataType === DataType.String) {
      if (!isCaseSensitive) {
        value1 = (value1 || "").toLowerCase();
        value2 = (value2 || "").toLowerCase();
      }
    } else {
      var normalize = getComparableFn(dataType);
      value1 = normalize(value1);
      value2 = normalize(value2);
    }
    if (value1 == value2) {
      return 0;
    } else if (value1 > value2 || value2 === undefined) {
      return isDescending ? -1 : 1;
    } else {
      return isDescending ? 1 : -1;
    }

  }

  function getComparableFn(dataType) {
    if (dataType && dataType.isDate) {
      // dates don't perform equality comparisons properly
      return function (value) {
        return value && value.getTime();
      };
    } else if (dataType === DataType.Time) {
      // durations must be converted to compare them
      return function (value) {
        return value && __durationToSeconds(value);
      };
    } else {
      return function (value) {
        return value;
      };
    }

  }


  testFns.output = function (text) {
    document.body.appendChild(document.createElement('pre')).innerHTML = text;
  };


  testFns.models = {};
  var models = testFns.models;

  function makeEntityCtor(fn) {
    if (testFns.modelLibrary == "backingStore") {
      return fn;
    } else if (testFns.modelLibrary == "ko") {
      return makeCtorForKnockout(fn);
    } else if (testFns.modelLibrary == "backbone") {
      return makeCtorForBackbone(fn);
    } else {
      throw Error("Cannot find matching testFns.modelLibrary");
    }
  }

  testFns.makeEntityCtor = makeEntityCtor;

  function makeCtorForKnockout(fn) {
    var instance = new fn();
    return function () {
      for (var p in instance) {
        if (instance.hasOwnProperty(p)) {
          var value = instance[p];
          if (typeof value == "function") {
            this[p] = value;
          } else {
            this[p] = ko.observable(value);
          }
        }
      }
    }
  }

  function makeCtorForBackbone(fn) {
    var instance = new fn();
    var model = { defaults: {} };
    for (var p in instance) {
      if (instance.hasOwnProperty(p)) {
        var value = instance[p];
        if (typeof value == "function") {
          model[p] = value;
        } else {
          model.defaults[p] = value;
        }
      }
    }
    return Backbone.Model.extend(model);
  }


  models.CustomerWithES5Props = function () {
    var ctor;
    if (testFns.modelLibrary == "ko") {
      ctor = function () {
      };
      createES5Props(ctor.prototype);
    } else if (testFns.modelLibrary == "backbone") {
      ctor = Backbone.Model.extend({
        initialize: function (attr, options) {
          createES5Props(this.attributes);
        }
      });
    } else {
      ctor = function () {
      };
      createES5Props(ctor.prototype);
    }
    return ctor;
  };

  function createES5Props(target) {
    Object.defineProperty(target, "companyName", {
      get: function () {
        return this["_companyName"] || null;
      },
      set: function (value) {
        this["_companyName"] = value && value.toUpperCase();
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(target, "idAndName", {
      get: function () {
        return this.customerID + ":" + (this._companyName || "");
      },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(target, "miscData", {
      get: function () {
        return this["_miscData"] || "asdf";
      },
      set: function (value) {
        this["_miscData"] = value;
      },
      enumerable: true,
      configurable: true
    });
  }


  testFns.sizeOf = sizeOf;
  testFns.sizeOfDif = sizeOfDif;

  testFns.makeTempString = function (length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  };

  testFns.arrayDistinct = function (array) {
    array = array || [];
    var result = [];
    for (var i = 0, j = array.length; i < j; i++) {
      if (result.indexOf(array[i]) < 0)
        result.push(array[i]);
    }
    return result;
  };


  function sizeOf(value, level) {
    if (level == undefined) level = 0;
    var bytes = 0, keyBytes = 0;
    var children = null;
    if (value == null) {
      bytes = 1; // not sure how much space a null or undefined take.
    } else if (typeof value === 'boolean') {
      bytes = 4;
    } else if (typeof value === 'string') {
      bytes = value.length * 2;
    } else if (typeof value === 'number') {
      bytes = 8;
    } else if (typeof value === 'object') {
      if (value['__visited__']) return null;
      value['__visited__'] = 1;
      children = [];
      for (var propName in value) {
        if (propName !== "__visited__") {
          var r = sizeOf(value[propName], 1);
          if (r != null && r.size !== 0) {
            bytes += r.size;
            r.name = propName;
            children.push(r);
          }
        }
      }
    }

    if (level == 0) {
      clearVisited(value);
    }
    if (children) {
      children.sort(function (a, b) {
        return b.size - a.size;
      });
      var alt = {};
      children.forEach(function (c) {
        alt[c.name] = c;
      });
      children = alt;
    }
    return {
      size: bytes,
      children: children
    };
  };

  function sizeOfDif(s1, s2) {

    var dif = (s1.size || 0) - (s2.size || 0);
    var s1Val, s2Val, oDif;
    if (dif === 0) return { dif: 0, children: [] };
    var children = [];
    var s1Children = s1.children || {};
    var s2Children = s2.children || {};
    for (var s1Key in s1Children) {
      s1Val = s1Children[s1Key];
      s2Val = s2Children[s1Key];
      if (s2Val) {
        s2Val.visited = true;
        oDif = sizeOfDif(s1Val, s2Val);
        if (oDif) {
          oDif.name = s1Key;
          children.push(oDif);
        }
      } else {
        oDif = { name: s1Key, dif: s1Val.size, s1Children: s1Val.children };
        children.push(oDif);
      }
    }
    for (var s2Key in s2Children) {
      s2Val = s2Children[s2Key];
      if (!s2Val.visited) {
        oDif = { name: "-" + s2Key, dif: -1 * s2Val.size, s2Children: s2Val.children };
        children.push(oDif);
      }
    }

    var alt = {};
    children.forEach(function (c) {
      alt[c.name] = c;
    });
    children = alt;

    return { dif: dif, children: children };
  }

  function clearVisited(value) {
    if (value == null) return;
    if (typeof value == 'object' && value["__visited__"]) {
      delete value['__visited__'];
      for (var i in value) {
        clearVisited(value[i]);
      }
    }
  }

  // Uncomment to test EntityQuery JSON serialization support.
  // proxyQueries();

  function proxyQueries() {
    var proto = EntityManager.prototype;
    proto.executeQuery = wrapExecuteQuery(proto.executeQuery);
    proto.executeQueryLocally = wrapExecuteQuery(proto.executeQueryLocally);
  }

  function wrapExecuteQuery(fn) {
    return function (query) {
      var qString = JSON.stringify(query);
      var qJson = JSON.parse(qString);
      var newQuery = new EntityQuery(qJson);
      if (query.entityManager) {
        newQuery = newQuery.using(query.entityManager);
      }
      if (query.dataService || query.jsonResultsAdapter) {
        newQuery = newQuery.using(query.dataService);
      }
      // need to accomodate executeQuery called with callbacks
      var args = Array.prototype.slice.call(arguments, 0);
      args[0] = newQuery;
      return fn.apply(this, args);
    }
  }

  //////////////
  /*********************************************************
  * Teardown for a module that saves to the Inheritance database
  *********************************************************/
  // should call this during test teardown to restore
  // the database to a known, populated state.
  function teardown_inheritanceReset() {
    stop();
    inheritanceReset() // jQuery promise
      .fail(testFns.handleFail).always(start);
  }

  function inheritanceReset() {
    return webApiCommand(testFns.inheritanceServiceName, 'reset');
  }
  function inheritancePurge() {
    return webApiCommand(testFns.inheritanceServiceName, 'purge');
  }

  /**************************************************
   * Pure Web API commands to a controller (POST)
   * Does NOT STOP/START the test runner!
   * Typically embedded in a service/command wrapper method
   *
   * Usage:
   *   function todoReset(){
   *       return webApiCommand(testFns.todoServiceName, 'reset');
   *   }
   *
   * module("Todo", {
   *   setup: ... ,
   *   teardown: testFns.teardown_todoReset
   * });
   **************************************************/
  function webApiCommand(serviceName, command, config) {
    var url = serviceName + '/' + command;
    config = config || {};
    config.type = config.type || "POST";
    return $.ajax(url, config)
      .success(function (data, textStatus, xhr) {
        return "Reset svc returned '" +
          xhr.status + "' with message: " + data;
      })
      .error(function (xhr, textStatus, errorThrown) {
        return Q.reject(getjQueryError(xhr, textStatus, errorThrown));
      });
  }




  /*********************************************************
  * Make a good error message from jQuery Ajax failure
  *********************************************************/
  function getjQueryError(xhr, textStatus, errorThrown) {
    if (!xhr) {
      return errorThrown;
    }
    var message = xhr.status + "-" + xhr.statusText;
    try {
      var reason = JSON.parse(xhr.responseText).Message;
      message += "\n" + reason;
    } catch (ex) {
      message += "\n" + xhr.responseText;
    }
    return message;
  }
  /////////////////////////

  testFns.breeze = breeze;
  testFns.configure();

  return testFns;
})(breeze);

