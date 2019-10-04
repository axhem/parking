import { Component, OnInit } from "@angular/core";
import * as L from "leaflet";
import * as $ from "jquery";
import { ParkingConfiguration } from "../../../environments/parking_config";
import Swal from "sweetalert2";
import { parse, stringify } from 'flatted/esm';

import {
  icon,
  Layer,
  imageOverlay,
  latLng,
  latLngBounds,
  Map,
  marker,
  point,
  polyline,
  tileLayer
} from "leaflet";

import "beautifymarker";
declare var $: any;

export enum DeviceType {
  device = 1,
  counter = 2
}

@Component({
  selector: "app-parking",
  templateUrl: "./parking.component.html",
  styleUrls: ["./parking.component.scss"]
})

export class ParkingComponent implements OnInit {
  map: L.Map;
  deviceLayerGroup: L.FeatureGroup;
  counterLayerGroup: L.FeatureGroup;
  isDisable = true;

  default_cordinate: L.LatLngExpression = [-2.5, 20.375];
  default_mapid: any = 1;
  selectedDevice = 1;
  selectedCounter: any = 1;
  localStorageObject = [];
  default_counter_cordinates: L.LatLngExpression = [-3.5, 14.375];
  defualt_zoom_level = 5;
  parking_object = [
    {
      tab_id: 1,
      tab_name: "A-Geschoss",
      map_id: 1,
      map_background: "assets/backgrounds/A-Geschoss.jpg",
      zoom_level: this.defualt_zoom_level,
      tab_flag: true,
      device: [],
      counter: []
    },
    {
      tab_id: 2,
      tab_name: "B-Geschoss",
      map_id: 2,
      map_background: "assets/backgrounds/B-Geschoss.jpg",
      zoom_level: this.defualt_zoom_level,
      tab_flag: true,
      device: [],
      counter: []
    },
    {
      tab_id: 3,
      tab_name: "C-Geschoss",
      map_id: 3,
      map_background: "assets/backgrounds/C-Geschoss.jpg",
      zoom_level: this.defualt_zoom_level,
      tab_flag: true,
      device: [],
      counter: []
    }
  ];
  removedDeviceId: number;
  // Default parking configuration
  default_map_width: number = ParkingConfiguration.map_width;
  default_map_height: number = ParkingConfiguration.map_height;
  center_x: number = ParkingConfiguration.center_x;
  center_y: number = ParkingConfiguration.center_y;
  map_background: any;
  //default list of devices
  list_of_devices = [
    {
      name: "Car",
      id: "1",
      icon: "car.png",
      cordinates: this.default_cordinate
    },
    {
      name: "Bicycle",
      id: "2",
      icon: "bicycle.png",
      cordinates: this.default_cordinate
    },
    {
      name: "Moto",
      id: "3",
      icon: "moto.png",
      cordinates: this.default_cordinate
    },
    {
      name: "Truck",
      id: "4",
      icon: "truck.png",
      cordinates: this.default_cordinate
    }
  ];
  //default list of counters
  list_of_counters = [
    {
      name: "Entry Counter",
      id: 1,
      cordinates: this.default_counter_cordinates
    },
    {
      name: "Exit Counter",
      id: 2,
      cordinates: this.default_counter_cordinates
    },
    {
      name: "Total Counter",
      id: 3,
      cordinates: this.default_counter_cordinates
    }
  ];
  mapsPlaceholder: any = [];
  deviceLayerGroupsPlaceholder: any = [];
  counterLayerGroupsPlaceholder: any = [];

  constructor() {
    //check if exists object on local storage get it
    //otherwise load default json object
    if (this.getObjectFromLocalStorage() !== null) {
      this.parking_object = this.getObjectFromLocalStorage();
    }
    this.deviceLayerGroup = L.featureGroup();
    this.counterLayerGroup = L.featureGroup();
  }

  ngOnInit() {
    this.loadBackground();
    this.tabs();
  }

  onChange(deviceValue) {
    this.selectedDevice = Number(deviceValue);
  }

  onChangeCounter(deviceValue) {
    this.selectedCounter = Number(deviceValue);
  }
  //Update Cordinates After dragging counter
  updateCordinatesAfterDragging(markerId, current_position, devicetype) {
    const tabid = $("li.active a").prop("id");
    var self = this;
    Object.keys(self.parking_object).forEach(function (key) {
      if (devicetype == DeviceType.device) {
        let current_device = self.parking_object[key]["device"];
        if (self.parking_object[key].tab_id == tabid) {
          if (current_device.length != 0) {
            Object.keys(current_device).forEach(function (index) {
              if (current_device[index].device_gen_id == markerId) {
                self.parking_object[key]["device"][index].zone_from = current_position
              }
            });
          }
        }
      } else {
        let current_counter = self.parking_object[key]["counter"];
        if (self.parking_object[key].tab_id == tabid) {
          if (current_counter.length != 0) {
            Object.keys(current_counter).forEach(function (index) {
              if (current_counter[index].device_gen_id == markerId) {
                self.parking_object[key]["counter"][index].zone_from = current_position
              }
            });
          }
        }
      }
    });
  }
  //load Counters from Json Object
  loadCounters(counters_obj, current_map) {
    var self = this;
    const counterMarker = new L.Marker(counters_obj.zone_from, {
      draggable: true,
      title: counters_obj.device_gen_id,
      icon: new L.DivIcon({
        className: "my-label",
        html:
          '<label style="display: inline-table!important;background-color: transparent;width: 80px;">' +
          counters_obj.counter_name +
          ":" +
          "</label>"
      })
    });
    self.counterLayerGroup.addLayer(counterMarker);
    counterMarker.on("dragend", function (e) {
      const chagedPos = e.target.getLatLng();
      self.updateCordinatesAfterDragging(e.target.options.title, chagedPos, DeviceType.counter);
      let pointXY = current_map.latLngToLayerPoint(chagedPos);
    });
    counterMarker.on("click", this.onCounterClick);
  }

  //add counter 
  addCounter() {
    const counter_id = this.list_of_counters.find(
      obj => obj.id == this.selectedCounter
    );
    const guid =
      this.selectedCounter.toString() +
      this.default_mapid.toString() +
      DeviceType.counter +
      new Date().getUTCMilliseconds().toString();
    const self = this;
    const tabid = $("li.active a").prop("id");
    this.map = this.mapsPlaceholder["#tab" + tabid];
    this.counterLayerGroup.addTo(this.map);
    var date = Date();
    var counter_date = date.toString();
    var counter_object = {
      countertype: "REAL",
      created: counter_date,
      fixed_static_capacity: 100,
      has_reset_at: true,
      id: this.selectedCounter,
      log_counter_readings: false,
      name: "entries",
      pre_full: 0,
      pre_open: 0,
      reset_at: 0,
      updated: null,
      value: 0,
      visible: true,
      zone_from: counter_id.cordinates,
      zone_to: null,
      device_gen_id: guid,
      counter_name: counter_id.name
    };
    const counterMarker = new L.Marker(counter_id.cordinates, {
      draggable: true,
      title: guid,
      icon: new L.DivIcon({
        className: "my-label",
        html:
          '<label style="display: inline-table!important;background-color: transparent;width: 80px;">' +
          counter_id.name +
          ":" +
          "</label>"
      })
    });
    this.counterLayerGroup.addLayer(counterMarker);
    counterMarker.on("dragend", function (e) {
      const chagedPos = e.target.getLatLng();
      self.updateCordinatesAfterDragging(e.target.options.title, chagedPos, DeviceType.counter);
      let pointXY = self.map.latLngToLayerPoint(chagedPos);
    });
    counterMarker.on("click", this.onCounterClick);

    this.parking_object[parseInt(tabid) - 1]["counter"].push(counter_object);
  }

  isInvalid() {
    return this.isDisable;
  }
  //Remove device of active tab
  removeDevice() {
    const tabid = $("li.active a").prop("id");
    const item = localStorage.getItem("removedDeviceId").toString();
    const device2 = parse(localStorage.getItem("device"));
    this.deviceLayerGroup.removeLayer(device2._leaflet_id);
    const current_device = this.parking_object[parseInt(tabid) - 1]["device"];
    Object.keys(current_device).forEach(function (index) {
      if (current_device[index].device_gen_id == item) {
        current_device.splice(parseInt(index), 1);
      }
    });
    $("#removedevice").prop("disabled", true);
  }

  onMarkerClick = function (e) {
    this.removedDeviceId = this.options.title;
    this.isDisable = false;

    localStorage.setItem("removedDeviceId", this.options.title);
    localStorage.setItem("device", stringify(this));
    $("#removedevice").prop("disabled", false);
  };

  //Remove counter of  active tab
  removeCounter() {
    const tabid = $("li.active a").prop("id");
    const item = localStorage.getItem("removedCounterId").toString();
    const marker = parse(localStorage.getItem("counter"));
    this.counterLayerGroup.removeLayer(marker._leaflet_id);
    const current_device = this.parking_object[parseInt(tabid) - 1]["counter"];
    Object.keys(current_device).forEach(function (index) {
      if (current_device[index].device_gen_id == item) {
        current_device.splice(parseInt(index), 1);
      }
    });
    $("#removecounter").prop("disabled", true);
  }

  //On Counter Click get event
  onCounterClick = function (e) {
    this.removedDeviceId = this.options.title;
    this.isDisable = false;

    localStorage.setItem("removedCounterId", this.options.title);
    localStorage.setItem("counter", stringify(this));
    $("#removecounter").prop("disabled", false);
  };

  //load devices from json object
  loadDevices(devices_obj, current_map) {
    let self = this;
    const deviceitem = self.list_of_devices.filter(function (item) {
      return item.id == devices_obj.id.toString();
    });
    const cIcon = L.icon({
      iconUrl: "assets/icons/" + deviceitem[0]["icon"],
      shadowUrl: "http://leafletjs.com/docs/images/leaf-shadow.png",
      iconSize: [25, 25],
      iconAnchor: [-2.5, 20.375],
      popupAnchor: [-3, -76]
    });

    const newMarker = L.marker(devices_obj.zone_from, {
      icon: cIcon,
      draggable: true,
      title: devices_obj.device_gen_id
    }).bindPopup("car.");

    self.deviceLayerGroup.addLayer(newMarker);
    newMarker.on("dragend", function (e) {
      const chagedPos = e.target.getLatLng();
      const pointXY = current_map.latLngToLayerPoint(chagedPos);
      self.updateCordinatesAfterDragging(e.target.options.title, chagedPos, DeviceType.device);
    });
    newMarker.on("click", self.onMarkerClick);
  }

  //add Device
  addDevice() {
    let self = this;
    const tabid = $("li.active a").prop("id");

    this.map = this.mapsPlaceholder["#tab" + tabid];
    const guid =
      this.selectedDevice.toString() +
      this.default_mapid.toString() +
      DeviceType.device +
      new Date().getUTCMilliseconds().toString();
    self = this;
    const deviceitem = self.list_of_devices.filter(function (item) {
      return item.id == self.selectedDevice.toString();
    });
    var date = Date();
    var device_date = date.toString();
    var device_object = {
      devicetype: "REAL",
      created: device_date,
      fixed_static_capacity: 100,
      has_reset_at: true,
      id: this.selectedDevice,
      log_device_readings: false,
      name: "entries",
      pre_full: 0,
      pre_open: 0,
      reset_at: 0,
      updated: null,
      value: 0,
      visible: true,
      zone_from: deviceitem[0]["cordinates"],
      zone_to: null,
      device_gen_id: guid,
      device_name: deviceitem[0]["name"]
    };

    this.deviceLayerGroup.addTo(this.map);
    const cIcon = L.icon({
      iconUrl: "assets/icons/" + deviceitem[0]["icon"],
      shadowUrl: "http://leafletjs.com/docs/images/leaf-shadow.png",
      iconSize: [25, 25],
      iconAnchor: [-2.5, 20.375],
      popupAnchor: [-3, -76]
    });

    const newMarker = L.marker(deviceitem[0]["cordinates"], {
      icon: cIcon,
      draggable: true,
      title: guid
    }).bindPopup("car.");

    this.deviceLayerGroup.addLayer(newMarker);
    newMarker.on("dragend", function (e) {
      const chagedPos = e.target.getLatLng();
      const pointXY = self.map.latLngToLayerPoint(chagedPos);
      self.updateCordinatesAfterDragging(e.target.options.title, chagedPos, DeviceType.device);
    });
    newMarker.on("click", this.onMarkerClick);
    this.parking_object[parseInt(tabid) - 1]["device"].push(device_object);
  }

  // get 64binary image name
  onFileChange(event, field) {
    const reader = new FileReader();
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      reader.readAsDataURL(file);

      reader.onload = () => {
        const object = {
          name: file.name,
          filetype: file.type,
          fileBinary: reader.result
        };
        this.map_background = object.fileBinary;
      };
    }
  }

  // push 64 binary file on json object
  onUpload() {
    const tabid = $("li.active a").prop("id");
    // Add uploaded image on general object
    for (const i in this.parking_object) {
      if (this.parking_object[i].tab_id == tabid) {
        this.parking_object[i].map_background = this.map_background;
      }
    }
    if (this.map_background == null) {
      this.onResponse("error", "", "Please select an map!");
    } else {
      this.map = this.mapsPlaceholder["#tab" + tabid];
      this.setBackgroundImage(this.map);
      this.onResponse("success", "", "Map saved succesfully!");
    }
  }

  // Add image in the background
  setBackgroundImage(test) {
    const osmUrl = this.map_background,
      h = this.default_map_height,
      w = this.default_map_width;
    const southWest = this.map.unproject([0, h], this.map.getMaxZoom());
    const northEast = this.map.unproject([w, 0], this.map.getMaxZoom());
    const bounds = new L.LatLngBounds(southWest, northEast);

    const imgOv = L.imageOverlay(osmUrl, bounds).addTo(test);
    test.setMaxBounds(bounds);
  }

  // set object in localstorage
  setObjectInLocalStorage() {
    const localStorageObject = this.parking_object.map(a => {
      return { ...a };
    });

    for (const i in localStorageObject) {
      if (localStorageObject[i].tab_flag === false) {
        localStorageObject[i].tab_flag = true;
      }
    }
    localStorage.setItem("parking", JSON.stringify(localStorageObject));
  }

  // get Object from localstorage
  getObjectFromLocalStorage() {
    const p_object = JSON.parse(localStorage.getItem("parking"));
    return p_object;
  }

  // remove object from localstorage
  removeObjectFromLocalStorage() {
    if (localStorage.getItem("parking") != null) {
      localStorage.removeItem("parking");
    }
  }

  // save configuration in the local storage
  saveConfiguration() {
    this.removeObjectFromLocalStorage();
    this.setObjectInLocalStorage();
    this.onResponse("success", "", "Json object saved in localstorage");
  }

  // rename tab and save on object
  onSaveTabName() {
    const tabid = $("li.active a").prop("id");
    const tabname = $("#edittab_" + tabid).text();
    for (const i in this.parking_object) {
      if (this.parking_object[i].tab_id == tabid) {
        this.parking_object[i].tab_name = tabname;
        this.onResponse("success", "", "Tab renamed succesfully!");
        break;
      }
    }
  }

  // notification for actions
  onResponse(type, title, message) {
    Swal.fire({
      position: "top-right",
      type,
      title,
      text: message,
      showConfirmButton: false,
      timer: 1500
    });
  }

  //load data from json object
  loadBackground() {
    const self = this;

    setTimeout(function () {
      self.fillTab(self.parking_object[0]["tab_id"], 0);
    }, 1000);
  }

  // Add new tabs
  tabs() {
    let tabID = this.parking_object.length;
    const self = this;

    $(document).ready(function () {
      const map_width = "909px";
      const map_height = "500px";
      $("#btn-add-tab").click(function () {
        tabID++;
        $(this)
          .closest("li")
          .before(
            '<li class="gentab"><a href="#tab' +
            tabID +
            '" role="tab" id="' +
            tabID +
            '" data-toggle="tab"><span contenteditable="true">Tab ' +
            tabID +
            '</span><button type = "button" class= "btn btn-default btn-xs"id = "savetab_' +
            tabID +
            '" title = "Rename this tab"> <i class="fa fa-floppy-o"aria-hidden="true"(click) = "onSaveTabName()" > </i></button> &nbsp; <button class="close" type="button" title="Remove this tab"> × </button></a></li>'
          );

        $("#tab-content").append(
          $(
            '<div class="tab-pane fade active" id="tab' +
            tabID +
            '"><div id="mapid_' +
            tabID +
            '" style="width:' +
            map_width +
            ";height:" +
            map_height +
            ';"></div> </div>'
          )
        );
        const new_tab = {
          tab_id: tabID,
          map_id: tabID,
          zoom_level: self.defualt_zoom_level,
          map_background: null,
          tab_name: "Tab" + tabID,
          tab_flag: false,
          device: [],
          counter: []
        };
        // push newly created tab on general_object
        self.parking_object.push(new_tab);
        $('.nav-tabs a[href="#tab' + tabID + '"]').tab("show");
        self.setDefaultMap(tabID, self.defualt_zoom_level);
        $(".edit").click(editHandler);
      });
      // Remove tab
      $("#tab-list").on("click", ".close", function () {
        const tabID = $(this)
          .parents("a")
          .attr("href");
        const tab_id = tabID.split("#tab");
        $(this)
          .parents("li")
          .remove();
        $(tabID).remove();
        self.removeTabFromObject(tab_id[1]);
        // display first tab
        const tabFirst = $("#tab-list a:first");
        self.onResponse("success", "", "Tab deleted successfully!");
        tabFirst.tab("show");
      });
      //click on generated tab
      $("#tab-list").on("click", ".gentab", function () {
        setTimeout(function () {
          const tabid = $("li.active a").prop("id");
          const index = self.findIndexByTabId(tabid);
          self.fillTab(tabid, index);
        }, 100);
      });
    });

    // Rename tabs
    const editHandler = function () {
      const t = $(this);
      $(this)
        .prev()
        .attr("contenteditable", "true")
        .focusout(function () {
          $(this)
            .removeAttr("contenteditable")
            .off("focusout");
          t.css("visibility", "visible");
        });
    };

    $(".edit").click(editHandler);
  }
  //find index by tabid
  findIndexByTabId(tabid) {
    var index = 0;
   for(var i= 0; i< this.parking_object.length;i++){
     if(this.parking_object[i].tab_id ==tabid){
       index = i;
       break;
     }
   }
    return index;
  }
  // remove tab from project
  removeTabFromObject(tab_id) {
    this.parking_object = this.parking_object.filter(function (e) {
      return e.tab_id != tab_id;
    });
    delete this.mapsPlaceholder["#tab" + tab_id];
    delete this.deviceLayerGroupsPlaceholder["#tab" + tab_id];
    delete this.counterLayerGroupsPlaceholder["#tab" + tab_id];
  }
  // set default on newly created tab
  setDefaultMap(mapid,zoom_level) {
    let tabid = "#tab" + mapid;
    this.map = L.map("mapid_" + mapid + "", {
      minZoom: -3,
      maxZoom: 5,
      center: [this.center_x, -this.center_y],
      zoom: zoom_level,
      crs: L.CRS.Simple
    });
    this.mapsPlaceholder[tabid] = this.map;
    this.deviceLayerGroupsPlaceholder[tabid] = L.featureGroup();
    this.counterLayerGroupsPlaceholder[tabid] = L.featureGroup();
    this.deviceLayerGroup = this.deviceLayerGroupsPlaceholder[tabid];
    this.counterLayerGroup = this.counterLayerGroupsPlaceholder[tabid];
  }

  //Fill tab with map,background,device,counter
  fillTab(tab, key) {
    let self = this;
    $("#tab" + self.parking_object[key]["tab_id"]).addClass("active");

    let tabid = "#tab" + tab;
    if (self.mapsPlaceholder[tabid]) { // tab map was already loaded
      self.map = self.mapsPlaceholder[tabid];
      self.deviceLayerGroup = self.deviceLayerGroupsPlaceholder[tabid];
      self.counterLayerGroup = self.counterLayerGroupsPlaceholder[tabid];
      //get zoom level
      self.getZoomLevel(self.map,key);
    }
    else { // tab map was never loaded and we should load it all
      self.setDefaultMap(tab,self.parking_object[key].zoom_level);
      self.map_background = self.parking_object[key].map_background;
      if (self.map_background !== null) {
        self.setBackgroundImage(self.map);
        //load counter of current map
        let current_counter = self.parking_object[key]["counter"];
        if (current_counter.length != 0) {
          self.counterLayerGroup.addTo(self.map);
          Object.keys(current_counter).forEach(function (index) {
            self.loadCounters(current_counter[index], self.map);
          });
        }
        let current_device = self.parking_object[key]["device"];
        if (current_device.length != 0) {
          self.deviceLayerGroup.addTo(self.map);
          Object.keys(current_device).forEach(function (index) {
            self.loadDevices(current_device[index], self.map);
          });
        }
      }
      //get zoom level
      self.getZoomLevel(self.map,key);
    }


    Object.keys(self.parking_object).forEach(function (key) {
      if (key !== "0") {
        $("#tab" + self.parking_object[key]["tab_id"]).removeClass("active");
      }
    });
  }
  //Get zoom level, update on the map
  getZoomLevel(map,index) {
    var self = this;
    $(document).ready(function () {
      map.on('zoomend', function () {
        var zoomlevel = map.getZoom();
        self.parking_object[index].zoom_level = zoomlevel;
      });
    });
  }

}