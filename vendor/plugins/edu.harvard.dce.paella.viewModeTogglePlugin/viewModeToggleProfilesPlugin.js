// #DCE required profiles for DCE's' ViewModeTogglePlugin adapted for Paella 6.2.0
paella.addProfile(() => {
  return new Promise((resolve, reject) => {
    paella.events.bind(paella.events.videoReady, () => {
      const validContent =[ "presenter", "presentation"];
      let streams = paella.player.videoContainer.streamProvider.videoStreams;
      let available = streams.every(v => (validContent.includes(v.content))) && streams.length == validContent.length;
      if (! available) {
        resolve(null);
      } else {
        // do not allow multi-video to load to single video view on first load unless on an iOS
        if (base.userAgent.system.iOS) {
          base.cookies.set('lastProfile', 'one_big');
        } else if (base.cookies.get('lastProfile') === 'one_big') {
          base.cookies.set('lastProfile', paella.player.config.defaultProfile || 'side_by_side');
        }
        resolve({
          "id": "side_by_side",
          "name": {
            "es": "Presentación y presentador"
          },
          "icon": "slide_professor_icon.png",
          validContent: validContent,
          "videos":[ {
            content: validContent[0],
            "rect":[ {
              "aspectRatio": "16/9",
              "width": "432",
              "height": "243",
              "top": "241",
              "left": "845"
            }, {
              "aspectRatio": "16/10",
              "width": "432",
              "height": "270",
              "top": "229",
              "left": "845"
            }, {
              "aspectRatio": "4/3",
              "width": "432",
              "height": "324",
              "top": "206",
              "left": "845"
            }],
            "visible": "true",
            "layer": "1"
          }, {
            content: validContent[1],
            "rect":[ {
              "aspectRatio": "16/9",
              "width": "832",
              "height": "468",
              "top": "133",
              "left": "5"
            }, {
              "aspectRatio": "16/10",
              "width": "832",
              "height": "520",
              "top": "102",
              "left": "5"
            }, {
              "aspectRatio": "4/3",
              "width": "828",
              "height": "621",
              "top": "52",
              "left": "5"
            }],
            "visible": "true",
            "layer": "1"
          }],
          "background": {
            "content": "",
            "zIndex": 5,
            "rect": {
              "left": "0",
              "top": "0",
              "width": "1280",
              "height": "720"
            },
            "visible": "true",
            "layer": "0"
          },
          logos:[],
          buttons:[],
          onApply: function () {
          },
          switch: function () {
            // prep toggle for next setProfile
            let v0 = this.videos[0].content;
            let v1 = this.videos[1].content;
            this.videos[0].content = v1;
            this.videos[1].content = v0;
          }
        })
      }
    });
  });
});
paella.addProfile(() => {
  return new Promise((resolve, reject) => {
    paella.events.bind(paella.events.videoReady, () => {
      const validContent =[ "presenter", "presentation"];
      let streams = paella.player.videoContainer.streamProvider.videoStreams;
      let available = streams.every(v => (validContent.includes(v.content))) && streams.length == validContent.length;

      if (! available) {
        resolve(null);
      } else {
        resolve({
          "id": "one_tiny_and_one_big",
          "name": {
            "en": "Tiny and Big"
          },
          "icon": "professor_slide_icon.png",
          validContent: validContent,
          "videos":[ {
            content: validContent[0],
            "rect":[ {
              "aspectRatio": "16/9",
              "width": "416",
              "height": "234",
              "top": "35",
              "left": "850"
            }, {
              "aspectRatio": "16/10",
              "width": "416",
              "height": "260",
              "top": "35",
              "left": "850"
            }, {
              "aspectRatio": "4/3",
              "width": "416",
              "height": "312",
              "top": "35",
              "left": "850"
            }],
            "visible": "true",
            "layer": "2"
          }, {
            content: validContent[1],
            "rect":[ {
              "aspectRatio": "16/9",
              "width": "1154",
              "height": "649",
              "top": "10",
              "left": "10"
            }, {
              "aspectRatio": "16/10",
              "width": "1050",
              "height": "656",
              "top": "10",
              "left": "117"
            }, {
              "aspectRatio": "4/3",
              "width": "932",
              "height": "699",
              "top": "10",
              "left": "50"
            }],
            "visible": "true",
            "layer": "1"
          }],
          "background": {
            "content": "",
            "zIndex": 5,
            "rect": {
              "left": "0",
              "top": "0",
              "width": "1280",
              "height": "720"
            },
            "visible": "true",
            "layer": "0"
          },
          logos:[],
          buttons:[],
          onApply: function () {
          },
          switch: function () {
            // prep toggle for next setProfile
            let v0 = this.videos[0].content;
            let v1 = this.videos[1].content;
            this.videos[0].content = v1;
            this.videos[1].content = v0;
          }
        })
      }
    });
  });
});
// end tiny_presenter profile
paella.addProfile(() => {
  return new Promise((resolve, reject) => {
    paella.events.bind(paella.events.videoReady, () => {
      const validContent =[ "presenter", "presentation"];
      let streams = paella.player.videoContainer.streamProvider.videoStreams;
      let available = streams.every(v => (validContent.includes(v.content))) && streams.length == validContent.length;

      if (! available) {
        resolve(null);
      } else {
        resolve({
          id: "one_big",
          name: {
            es: "Un stream"
          },
          hidden: false,
          icon: "",
          validContent: validContent,
          videos:[ {
            content: validContent[0],
            rect:[ {
              aspectRatio: "1/1", left: 280, top: 0, width: 720, height: 720
            }, {
              aspectRatio: "6/5", left: 208, top: 0, width: 864, height: 720
            }, {
              aspectRatio: "5/4", left: 190, top: 0, width: 900, height: 720
            }, {
              aspectRatio: "4/3", left: 160, top: 0, width: 960, height: 720
            }, {
              aspectRatio: "11/8", left: 145, top: 0, width: 990, height: 720
            }, {
              aspectRatio: "1.41/1", left: 132, top: 0, width: 1015, height: 720
            }, {
              aspectRatio: "1.43/1", left: 125, top: 0, width: 1029, height: 720
            }, {
              aspectRatio: "3/2", left: 100, top: 0, width: 1080, height: 720
            }, {
              aspectRatio: "16/10", left: 64, top: 0, width: 1152, height: 720
            }, {
              aspectRatio: "5/3", left: 40, top: 0, width: 1200, height: 720
            }, {
              aspectRatio: "16/9", left: 0, top: 0, width: 1280, height: 720
            }, {
              aspectRatio: "1.85/1", left: 0, top: 14, width: 1280, height: 692
            }, {
              aspectRatio: "2.35/1", left: 0, top: 87, width: 1280, height: 544
            }, {
              aspectRatio: "2.41/1", left: 0, top: 94, width: 1280, height: 531
            }, {
              aspectRatio: "2.76/1", left: 0, top: 128, width: 1280, height: 463
            }],
            visible: true,
            layer: 1
          }, {
            content: validContent[1],
            "rect":[ {
              "aspectRatio": "16/9",
              "width": "0",
              "height": "0",
              "top": "0",
              "left": "0"
            }],
            "visible": false,
            "layer": "2"
          }],
          background: {
            content: "", zIndex: 5, rect: {
              left: 0, top: 0, width: 1280, height: 720
            },
            visible: false, layer: 0
          },
          logos:[],
          buttons:[],
          onApply: function () {
          },
          switch: function () {
            // prep toggle for next setProfile
            let vc0 = this.validContent[0];
            let vc1 = this.validContent[1];
            this.validContent[0] = vc1;
            this.validContent[1] = vc0;
            this.videos[0].content = vc1;
            this.videos[1].content = vc0;

          }
        })
      }
    });
  });
});
