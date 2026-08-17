import type { IDataObject } from 'n8n-workflow';

/**
 * Ready-made Shotstack edits, embedded so a new user can render something
 * good without writing JSON first.
 *
 * All but the first are the published edits from https://shotstack.io/templates/
 * The first is ours: the gallery has effectively no vertical example, and vertical
 * is the most common shape in real n8n render traffic.
 *
 * These are DATA, not code. Editing one changes what that dropdown entry renders.
 */

export const EXAMPLE_EDITS: Record<string, IDataObject> = {
	// Vertical Social Short (9:16) — source: verified
	verticalSocialShort: {
	  "timeline": {
	    "background": "#000000",
	    "soundtrack": {
	      "src": "https://shotstack-assets.s3.amazonaws.com/music/unminus/lit.mp3",
	      "effect": "fadeOut",
	      "volume": 0.4
	    },
	    "fonts": [
	      {
	        "src": "https://shotstack-assets.s3.amazonaws.com/fonts/Oswald-VariableFont.ttf"
	      }
	    ],
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "text",
	              "text": "YOUR HEADLINE",
	              "font": {
	                "family": "Oswald",
	                "size": 110,
	                "color": "#ffffff",
	                "weight": 700
	              },
	              "alignment": {
	                "horizontal": "center",
	                "vertical": "center"
	              },
	              "stroke": {
	                "color": "#000000",
	                "width": 6
	              }
	            },
	            "start": 0.4,
	            "length": 2.6,
	            "offset": {
	              "y": 0.22
	            },
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "text",
	              "text": "SECOND LINE",
	              "font": {
	                "family": "Oswald",
	                "size": 150,
	                "color": "#ffd400",
	                "weight": 700
	              },
	              "alignment": {
	                "horizontal": "center",
	                "vertical": "center"
	              },
	              "stroke": {
	                "color": "#000000",
	                "width": 6
	              }
	            },
	            "start": 3.2,
	            "length": 2.6,
	            "offset": {
	              "y": 0.22
	            },
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.amazonaws.com/footage/skateboarder.mp4"
	            },
	            "start": 0,
	            "length": 3.2,
	            "fit": "crop",
	            "scale": 1,
	            "effect": "zoomIn",
	            "transition": {
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.amazonaws.com/footage/beach.mp4"
	            },
	            "start": 3.2,
	            "length": 2.8,
	            "fit": "crop",
	            "scale": 1,
	            "effect": "slideLeft",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "size": {
	      "width": 1080,
	      "height": 1920
	    },
	    "fps": 30,
	    "quality": "high"
	  }
	} as IDataObject,
	// Starter: Title, Image and Video — source: basic-edits-title-image-video
	basicEditsTitleImageVideo: {
	  "timeline": {
	    "soundtrack": {
	      "src": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/unminus/berlin.mp3"
	    },
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "title",
	              "text": "Hello World",
	              "style": "minimal",
	              "size": "x-small"
	            },
	            "start": 0,
	            "length": 5,
	            "transition": {
	              "in": "slideRight",
	              "out": "fade"
	            },
	            "effect": "zoomIn"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/images/wave-barrel.jpg"
	            },
	            "start": 0,
	            "length": 5,
	            "effect": "zoomIn"
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://s3-ap-southeast-2.amazonaws.com/shotstack-assets/footage/cat.hd.mp4",
	              "trim": 5
	            },
	            "start": 5,
	            "length": 5
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "resolution": "sd"
	  }
	} as IDataObject,
	// Photo Slideshow (Ken Burns) — source: ken-burns-effect-slideshow
	kenBurnsEffectSlideshow: {
	  "timeline": {
	    "soundtrack": {
	      "src": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/freepd/advertising.mp3",
	      "effect": "fadeInFadeOut"
	    },
	    "background": "#000000",
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280"
	            },
	            "start": 0,
	            "length": 5,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/1680140/pexels-photo-1680140.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280"
	            },
	            "start": 4,
	            "length": 5,
	            "effect": "slideUp",
	            "transition": {
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/847393/pexels-photo-847393.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280"
	            },
	            "start": 8,
	            "length": 5,
	            "effect": "slideLeft",
	            "transition": {
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280"
	            },
	            "start": 12,
	            "length": 5,
	            "effect": "zoomOut",
	            "transition": {
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/1452701/pexels-photo-1452701.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280"
	            },
	            "start": 16,
	            "length": 5,
	            "effect": "slideDown",
	            "transition": {
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/756856/pexels-photo-756856.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280"
	            },
	            "start": 20,
	            "length": 5,
	            "effect": "slideRight",
	            "transition": {
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/1533720/pexels-photo-1533720.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280"
	            },
	            "start": 24,
	            "length": 5,
	            "effect": "zoomIn",
	            "transition": {
	              "out": "fade"
	            }
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "resolution": "hd"
	  }
	} as IDataObject,
	// Car Sale Slideshow — source: car-sale-slideshow-video
	carSaleSlideshowVideo: {
	  "timeline": {
	    "soundtrack": {
	      "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/music/unminus/kring.mp3",
	      "effect": "fadeOut"
	    },
	    "background": "#000000",
	    "cache": false,
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">2021</p>",
	              "css": "p { color: #ffffff; font-size: 160px; font-family: Montserrat ExtraBold; text-align: left }",
	              "width": 396,
	              "height": 180
	            },
	            "start": 0,
	            "length": 4,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.317,
	              "y": 0.095
	            },
	            "position": "center",
	            "transition": {
	              "in": "slideUp",
	              "out": "slideDown"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">MERCEDES-BENZ</p>",
	              "css": "p { color: #ffffff; font-size: 80px; font-family: Montserrat ExtraBold; text-align: left }",
	              "width": 1131,
	              "height": 80
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0.098,
	              "y": 0.116
	            },
	            "position": "center",
	            "transition": {
	              "in": "slideUp",
	              "out": "slideDown"
	            },
	            "start": 0.5,
	            "length": 3.5
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">A-CLASS A-180 AUTO</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat SemiBold; text-align: left }",
	              "width": 1133,
	              "height": 77
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0.099,
	              "y": 0.045
	            },
	            "position": "center",
	            "start": 1,
	            "length": 3,
	            "transition": {
	              "out": "slideDown",
	              "in": "slideUp"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">DEALER | USED | QUEENSLAND, 4029</p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: Montserrat SemiBold; text-align: left }",
	              "width": 826,
	              "height": 59
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0.019,
	              "y": -0.014
	            },
	            "position": "center",
	            "transition": {
	              "out": "slideDown",
	              "in": "slideUp"
	            },
	            "start": 1.2,
	            "length": 2.8
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9513395.jpg"
	            },
	            "start": 0,
	            "length": 5,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "fit": "crop",
	            "opacity": 0.4
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">KMS</p>",
	              "css": "p { color: #ffffff; font-size: 40px; font-family: Montserrat SemiBold; text-align: left }",
	              "width": 144,
	              "height": 93
	            },
	            "length": 5,
	            "start": 5,
	            "transition": {
	              "out": "slideDown",
	              "in": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.178,
	              "y": 0.021
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">4CYL 2.0L TURBO PETROL</p>",
	              "css": "p { color: #ffffff; font-size: 40px; font-family: Montserrat SemiBold; text-align: left }",
	              "width": 620,
	              "height": 72
	            },
	            "length": 5,
	            "start": 5,
	            "transition": {
	              "out": "slideDown",
	              "in": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.235,
	              "y": -0.05
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">48,364</p>",
	              "css": "p { color: #ffffff; font-size: 90px; font-family: Montserrat ExtraBold; text-align: left }",
	              "width": 353,
	              "height": 109
	            },
	            "length": 5,
	            "start": 5,
	            "transition": {
	              "out": "slideDown",
	              "in": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.302,
	              "y": 0.035
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">&nbsp;</p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: Roboto Black; text-align: center; }",
	              "width": 100,
	              "height": 600,
	              "background": "#d96657"
	            },
	            "start": 5,
	            "length": 5,
	            "position": "center",
	            "transition": {
	              "in": "carouselDown",
	              "out": "slideDown"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.474,
	              "y": 0
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9513355.jpg"
	            },
	            "start": 5.7,
	            "length": 4.3,
	            "offset": {
	              "x": 0.2,
	              "y": 0
	            },
	            "position": "center",
	            "fit": "none",
	            "scale": 0.5,
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideRight"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9513355-2.jpg"
	            },
	            "fit": "crop",
	            "position": "center",
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "start": 4,
	            "length": 6,
	            "scale": 1,
	            "opacity": 0.4
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9513404.jpg"
	            },
	            "effect": "zoomIn",
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "fit": "crop",
	            "scale": 1,
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "start": 9,
	            "length": 3
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">INTERIOR</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat ExtraBold; text-align: left }",
	              "width": 620,
	              "height": 96
	            },
	            "start": 11.5,
	            "length": 5.5,
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideRight"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.25,
	              "y": 0.054
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">White Nappa leather, front heated seats, 4 door, 5 seats.</p>",
	              "css": "p { color: #ffffff; font-size: 36px; font-family: Montserrat SemiBold; text-align: left }",
	              "width": 823,
	              "height": 180
	            },
	            "start": 11.5,
	            "length": 5.5,
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideRight"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.197,
	              "y": -0.031
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\"></p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: Roboto Black; text-align: center; }",
	              "width": 50,
	              "height": 300,
	              "background": "#d96657"
	            },
	            "transition": {
	              "in": "carouselDown",
	              "out": "slideDown"
	            },
	            "start": 11.5,
	            "length": 5.5,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.487,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9513356.jpg"
	            },
	            "start": 11,
	            "length": 7,
	            "effect": "zoomIn",
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "fit": "crop",
	            "scale": 1
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9265832.jpg"
	            },
	            "start": 17,
	            "length": 4,
	            "effect": "zoomIn",
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">UPGRADES</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat ExtraBold; text-align: left }",
	              "width": 620,
	              "height": 108
	            },
	            "start": 21,
	            "length": 4,
	            "transition": {
	              "in": "slideDown",
	              "out": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.245,
	              "y": 0.057
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Harmon Kardon sound system, Keyless Go, 360 surround view camera, rain sensing wipers.</p>",
	              "css": "p { color: #ffffff; font-size: 36px; font-family: Montserrat SemiBold; text-align: left }",
	              "width": 903,
	              "height": 121
	            },
	            "start": 21,
	            "length": 4,
	            "transition": {
	              "in": "slideDown",
	              "out": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.172,
	              "y": -0.024
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\"></p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: Roboto Black; text-align: center; }",
	              "width": 50,
	              "height": 300,
	              "background": "#d96657"
	            },
	            "transition": {
	              "in": "carouselDown",
	              "out": "slideDown"
	            },
	            "start": 21,
	            "length": 4,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.487,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9513392.jpg"
	            },
	            "start": 20,
	            "length": 6,
	            "effect": "zoomIn",
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">$46,990</p>",
	              "css": "p { color: #ffffff; font-size: 150px; font-family: Montserrat ExtraBold; text-align: center; }",
	              "width": 1133,
	              "height": 180
	            },
	            "start": 28,
	            "length": 3,
	            "transition": {
	              "out": "slideUp",
	              "in": "slideDown"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">including taxes and registration</p>",
	              "css": "p { color: #ffffff; font-size: 36px; font-family: Montserrat SemiBold; text-align: center; }",
	              "width": 620,
	              "height": 93
	            },
	            "transition": {
	              "out": "slideUp",
	              "in": "slideDown"
	            },
	            "start": 28,
	            "length": 3,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": -0.143
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/logos/carmart-white.png"
	            },
	            "start": 30.8,
	            "length": 5.2,
	            "fit": "none",
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "transition": {
	              "in": "slideUp"
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">carmart.co</p>",
	              "css": "p { color: #ffffff; font-size: 40px; font-family: Montserrat SemiBold; text-align: center; }",
	              "width": 1920,
	              "height": 1080
	            },
	            "length": 5,
	            "offset": {
	              "y": -0.2,
	              "x": 0
	            },
	            "start": 31,
	            "transition": {
	              "in": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/templates/car-dealer-slideshow/pexels-photo-9265834.jpg"
	            },
	            "start": 25,
	            "length": 8,
	            "effect": "zoomIn",
	            "transition": {
	              "out": "fade"
	            },
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "fit": "crop",
	            "scale": 1,
	            "opacity": 0.4
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "size": {
	      "width": 1920,
	      "height": 1080
	    }
	  }
	} as IDataObject,
	// Car Walkaround — source: car-walkaround-video
	carWalkaroundVideo: {
	  "output": {
	    "format": "mp4",
	    "resolution": "hd",
	    "poster": {
	      "capture": 10
	    }
	  },
	  "timeline": {
	    "soundtrack": {
	      "src": "https://shotstack-assets.s3.amazonaws.com/music/hyper.mp3",
	      "effect": "fadeOut"
	    },
	    "fonts": [
	      {
	        "src": "https://templates.shotstack.io/basic/asset/font/montserrat-regular.ttf"
	      },
	      {
	        "src": "https://templates.shotstack.io/basic/asset/font/montserrat-bold.ttf"
	      },
	      {
	        "src": "https://templates.shotstack.io/basic/asset/font/montserrat-black.ttf"
	      }
	    ],
	    "tracks": [
	      {
	        "clips": [
	          {
	            "start": 0,
	            "length": 13,
	            "position": "bottomLeft",
	            "asset": {
	              "width": 600,
	              "html": "<p class='title'>Lamborghini Huracan EVO Auto AWD</p><p class='subtitle'>2019 | 10cyl 5.2L Petrol | 17,100 kms</p>",
	              "css": "p { text-align: left; color: #ffffff; } .title { font-family: 'Montserrat Black'; font-size: 42px; } .subtitle { font-family: 'Montserrat Bold'; font-size: 28px; color: #f1c40f; }",
	              "type": "html",
	              "height": 180
	            },
	            "offset": {
	              "x": 0.05,
	              "y": 0.03
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "start": 0,
	            "length": 13,
	            "position": "bottomRight",
	            "asset": {
	              "width": 600,
	              "html": "<p><span>Enquiries</span></p><p>Dean / 703-438-5736</p>",
	              "css": "p { font-family: 'Montserrat Bold'; color: #ffffff; black; font-size: 28px; text-align: right; } span { color: #f1c40f; }",
	              "type": "html",
	              "height": 160
	            },
	            "offset": {
	              "x": -0.05,
	              "y": 0
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "start": 0,
	            "length": 5,
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.amazonaws.com/footage/luxury-car-1.mp4"
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "start": 4,
	            "length": 5,
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.amazonaws.com/footage/luxury-car-2.mp4"
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "start": 8,
	            "length": 5,
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.amazonaws.com/footage/luxury-car-3.mp4"
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      }
	    ]
	  }
	} as IDataObject,
	// Real Estate Listing (with merge fields) — source: real-estate-slideshow-sd-overlays-merge — placeholders: ADDRESS_1, ADDRESS_2, AGENT_NAME, BATHS, BEDS, CARS, EMAIL, HEADSHOT, IMAGE_1, IMAGE_2, IMAGE_3, IMAGE_4, IMAGE_5, LOGO, OVERLAY_COLOR, OVERLAY_STYLE, PHONE, PRIMARY_COLOR, PRIMARY_FONT, PRIMARY_FONT_SRC, PROPERTY_TYPE, SALE_TYPE, SECONDARY_COLOR, SECONDARY_FONT, SECONDARY_FONT_SRC, SOUNDTRACK
	realEstateSlideshowSdOverlaysMerge: {
	  "merge": [
	    {
	      "find": "ADDRESS_1",
	      "replace": "192 STOREY STREET"
	    },
	    {
	      "find": "ADDRESS_2",
	      "replace": "MAROUBRA, NSW 2035"
	    },
	    {
	      "find": "SALE_TYPE",
	      "replace": "HOUSE"
	    },
	    {
	      "find": "PROPERTY_TYPE",
	      "replace": "AUCTION 22 OCTOBER"
	    },
	    {
	      "find": "BEDS",
	      "replace": "4"
	    },
	    {
	      "find": "BATHS",
	      "replace": "2"
	    },
	    {
	      "find": "CARS",
	      "replace": "1"
	    },
	    {
	      "find": "HEADSHOT",
	      "replace": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/images/real-estate-agent-male.jpg"
	    },
	    {
	      "find": "AGENT_NAME",
	      "replace": "JEREMY SIMPSON"
	    },
	    {
	      "find": "LOGO",
	      "replace": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/logos/real-estate-white.png"
	    },
	    {
	      "find": "PHONE",
	      "replace": "0424 998 776"
	    },
	    {
	      "find": "EMAIL",
	      "replace": "jeremy@blockrealestate.co"
	    },
	    {
	      "find": "IMAGE_1",
	      "replace": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/images/realestate1.jpg"
	    },
	    {
	      "find": "IMAGE_2",
	      "replace": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/images/realestate2.jpg"
	    },
	    {
	      "find": "IMAGE_3",
	      "replace": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/images/realestate3.jpg"
	    },
	    {
	      "find": "IMAGE_4",
	      "replace": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/images/realestate4.jpg"
	    },
	    {
	      "find": "IMAGE_5",
	      "replace": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/images/realestate5.jpg"
	    },
	    {
	      "find": "PRIMARY_FONT",
	      "replace": "Manrope ExtraBold"
	    },
	    {
	      "find": "PRIMARY_FONT_SRC",
	      "replace": "https://templates.shotstack.io/basic/asset/font/manrope-extrabold.ttf"
	    },
	    {
	      "find": "PRIMARY_COLOR",
	      "replace": "#f0c20c"
	    },
	    {
	      "find": "SECONDARY_FONT",
	      "replace": "Manrope Light"
	    },
	    {
	      "find": "SECONDARY_FONT_SRC",
	      "replace": "https://templates.shotstack.io/basic/asset/font/manrope-light.ttf"
	    },
	    {
	      "find": "SECONDARY_COLOR",
	      "replace": "#ffffff"
	    },
	    {
	      "find": "OVERLAY_STYLE",
	      "replace": "arrow-sharp"
	    },
	    {
	      "find": "OVERLAY_COLOR",
	      "replace": "black"
	    },
	    {
	      "find": "SOUNDTRACK",
	      "replace": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/music/unminus/ambisax.mp3"
	    }
	  ],
	  "timeline": {
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{ADDRESS_1}}</p>",
	              "css": "p { font-family: \"{{PRIMARY_FONT}}\"; color: {{PRIMARY_COLOR}}; font-size: 40px; text-align: left;    line-height: 78; text-scale: shrink; }",
	              "width": 320,
	              "height": 200,
	              "position": "bottom"
	            },
	            "start": 1.2,
	            "length": 4.2,
	            "position": "left",
	            "offset": {
	              "x": 0.05,
	              "y": 0.3
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{ADDRESS_2}}</p>",
	              "css": "p { font-family: \"{{SECONDARY_FONT}}\"; color: {{SECONDARY_COLOR}}; font-size: 22px; text-align: left;    line-height: 78; }",
	              "width": 320,
	              "height": 66,
	              "position": "top"
	            },
	            "start": 1.3,
	            "length": 3.9,
	            "position": "left",
	            "offset": {
	              "x": 0.05,
	              "y": 0.065
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{SALE_TYPE}}</p>",
	              "css": "p { font-family: \"{{PRIMARY_FONT}}\"; color: {{PRIMARY_COLOR}}; font-size: 22px; text-align: left;    line-height: 78; }",
	              "width": 320,
	              "height": 100,
	              "position": "top"
	            },
	            "start": 1.4,
	            "length": 4,
	            "position": "left",
	            "offset": {
	              "x": 0.05,
	              "y": -0.24
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{PROPERTY_TYPE}}</p>",
	              "css": "p { font-family: \"{{SECONDARY_FONT}}\"; color: {{SECONDARY_COLOR}}; font-size: 17px; text-align: left;    line-height: 78; }",
	              "width": 320,
	              "height": 32,
	              "position": "center"
	            },
	            "start": 1.4,
	            "length": 4,
	            "position": "left",
	            "offset": {
	              "x": 0.05,
	              "y": -0.08
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://templates.shotstack.io/basic/asset/image/icon/slimline/white/26px/bed.png"
	            },
	            "start": 1.4,
	            "length": 4,
	            "fit": "none",
	            "position": "left",
	            "offset": {
	              "x": 0.055,
	              "y": -0.025
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://templates.shotstack.io/basic/asset/image/icon/slimline/white/26px/bath.png"
	            },
	            "start": 1.4,
	            "length": 4,
	            "fit": "none",
	            "position": "left",
	            "offset": {
	              "x": 0.13,
	              "y": -0.025
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://templates.shotstack.io/basic/asset/image/icon/slimline/white/26px/car.png"
	            },
	            "start": 1.4,
	            "length": 4,
	            "fit": "none",
	            "position": "left",
	            "offset": {
	              "x": 0.205,
	              "y": -0.025
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{BEDS}}</p>",
	              "css": "p { font-family: \"{{PRIMARY_FONT}}\"; color: {{SECONDARY_COLOR}}; font-size: 18px; text-align: left;     }",
	              "width": 36,
	              "height": 26,
	              "position": "center"
	            },
	            "start": 1.4,
	            "length": 4,
	            "position": "left",
	            "offset": {
	              "x": 0.09,
	              "y": -0.025
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{BATHS}}</p>",
	              "css": "p { font-family: \"{{PRIMARY_FONT}}\"; color: {{SECONDARY_COLOR}}; font-size: 18px; text-align: left;     }",
	              "width": 36,
	              "height": 26,
	              "position": "center"
	            },
	            "start": 1.4,
	            "length": 4,
	            "position": "left",
	            "offset": {
	              "x": 0.165,
	              "y": -0.025
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{CARS}}</p>",
	              "css": "p { font-family: \"{{PRIMARY_FONT}}\"; color: {{SECONDARY_COLOR}}; font-size: 18px; text-align: left;     }",
	              "width": 36,
	              "height": 26,
	              "position": "center"
	            },
	            "start": 1.4,
	            "length": 4,
	            "position": "left",
	            "offset": {
	              "x": 0.24,
	              "y": -0.025
	            },
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "luma",
	              "src": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/luma-mattes/circle.jpg"
	            },
	            "start": 30,
	            "length": 6
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{HEADSHOT}}"
	            },
	            "start": 30,
	            "length": 6,
	            "fit": "none",
	            "scale": 0.4,
	            "offset": {
	              "x": 0,
	              "y": 0.22
	            },
	            "transition": {
	              "in": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{AGENT_NAME}}</p>",
	              "css": "p { font-family: \"{{PRIMARY_FONT}}\"; color: {{PRIMARY_COLOR}}; font-size: 26px; text-align: center;     }",
	              "width": 600,
	              "height": 36,
	              "position": "center"
	            },
	            "start": 30,
	            "length": 6,
	            "offset": {
	              "x": 0,
	              "y": 0.045
	            },
	            "transition": {
	              "in": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>{{PHONE}}<br>{{EMAIL}}</p>",
	              "css": "p { font-family: \"{{SECONDARY_FONT}}\"; color: {{SECONDARY_COLOR}}; font-size: 18px; text-align: center;     }",
	              "width": 600,
	              "height": 64,
	              "position": "center"
	            },
	            "start": 30,
	            "length": 6,
	            "offset": {
	              "x": 0,
	              "y": -0.24
	            },
	            "transition": {
	              "in": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{LOGO}}"
	            },
	            "start": 30,
	            "length": 6,
	            "fit": "none",
	            "scale": 0.26,
	            "offset": {
	              "x": 0,
	              "y": -0.08
	            },
	            "transition": {
	              "in": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://templates.shotstack.io/basic/asset/video/overlay/{{OVERLAY_STYLE}}/{{OVERLAY_COLOR}}/content-left-in.mov"
	            },
	            "start": 0,
	            "length": 4.48
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://templates.shotstack.io/basic/asset/video/overlay/{{OVERLAY_STYLE}}/{{OVERLAY_COLOR}}/content-left-out.mov"
	            },
	            "start": 4.52,
	            "length": 2
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://templates.shotstack.io/basic/asset/video/overlay/{{OVERLAY_STYLE}}/{{OVERLAY_COLOR}}/transition-right.mov"
	            },
	            "start": 10.56,
	            "length": 3
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://templates.shotstack.io/basic/asset/video/overlay/{{OVERLAY_STYLE}}/{{OVERLAY_COLOR}}/transition-up.mov"
	            },
	            "start": 16.56,
	            "length": 3
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://templates.shotstack.io/basic/asset/video/overlay/{{OVERLAY_STYLE}}/{{OVERLAY_COLOR}}/transition-left.mov"
	            },
	            "start": 22.56,
	            "length": 3
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://templates.shotstack.io/basic/asset/video/overlay/{{OVERLAY_STYLE}}/{{OVERLAY_COLOR}}/outro-in.mov"
	            },
	            "start": 29,
	            "length": 7
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{IMAGE_1}}"
	            },
	            "start": 0,
	            "length": 6,
	            "effect": "zoomInSlow",
	            "transition": {
	              "in": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{IMAGE_2}}"
	            },
	            "start": 6,
	            "length": 6,
	            "effect": "slideLeftSlow"
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{IMAGE_3}}"
	            },
	            "start": 12,
	            "length": 6,
	            "effect": "slideRightSlow"
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{IMAGE_4}}"
	            },
	            "start": 18,
	            "length": 6,
	            "effect": "slideUpSlow"
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{IMAGE_5}}"
	            },
	            "start": 24,
	            "length": 6,
	            "effect": "slideLeftSlow"
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{IMAGE_1}}"
	            },
	            "start": 30,
	            "length": 6,
	            "effect": "zoomInSlow"
	          }
	        ]
	      }
	    ],
	    "fonts": [
	      {
	        "src": "{{PRIMARY_FONT_SRC}}"
	      },
	      {
	        "src": "{{SECONDARY_FONT_SRC}}"
	      }
	    ],
	    "soundtrack": {
	      "src": "{{SOUNDTRACK}}",
	      "effect": "fadeOut"
	    }
	  },
	  "output": {
	    "format": "mp4",
	    "resolution": "sd"
	  }
	} as IDataObject,
	// Real Estate Walkthrough (1080p) — source: real-estate-walkthrough-1080-overlays
	realEstateWalkthrough1080Overlays: {
	  "timeline": {
	    "soundtrack": {
	      "src": "https://assets.mixkit.co/music/download/mixkit-serene-view-443.mp3",
	      "effect": "fadeOut"
	    },
	    "fonts": [
	      {
	        "src": "https://shotstack-ingest-api-dev-sources.s3.ap-southeast-2.amazonaws.com/z33knba4tb/zzy9j7zb-2y1a-wh10-lj0q-15crit42hgr5/source.ttf"
	      },
	      {
	        "src": "https://shotstack-ingest-api-dev-sources.s3.ap-southeast-2.amazonaws.com/z33knba4tb/zzy9j7z3-1yfw-mf28-0vis-1ls6me1cljkc/source.ttf"
	      }
	    ],
	    "background": "#000000",
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">26 George Street</p>",
	              "css": "p { color: #ffffff; font-size: 84px; font-family: Noto Serif Display; text-align: left; }",
	              "width": 1200,
	              "height": 119
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.061,
	              "y": -0.337
	            },
	            "position": "center",
	            "start": 1.2,
	            "length": 4.5,
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Living Room</p>",
	              "css": "p { color: #ffffff; font-size: 84px; font-family: Noto Serif Display; text-align: left; }",
	              "width": 1000,
	              "height": 100
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.13,
	              "y": -0.267
	            },
	            "position": "center",
	            "start": 7,
	            "length": 5,
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Main Bedroom</p>",
	              "css": "p { color: #ffffff; font-size: 84px; font-family: Noto Serif Display; text-align: left; }",
	              "width": 1000,
	              "height": 100
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.13,
	              "y": -0.267
	            },
	            "position": "center",
	            "start": 14.2,
	            "length": 5,
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Guest Bedroom</p>",
	              "css": "p { color: #ffffff; font-size: 84px; font-family: Noto Serif Display; text-align: left; }",
	              "width": 1000,
	              "height": 100
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.13,
	              "y": -0.267
	            },
	            "position": "center",
	            "start": 22.2,
	            "length": 5,
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Home Office</p>",
	              "css": "p { color: #ffffff; font-size: 84px; font-family: Noto Serif Display; text-align: left; }",
	              "width": 1000,
	              "height": 100
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.13,
	              "y": -0.267
	            },
	            "position": "center",
	            "length": 5,
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            },
	            "start": 30.2
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/logos/real-estate-white.png"
	            },
	            "start": 39.3,
	            "length": 3.7,
	            "scale": 0.8,
	            "offset": {
	              "x": 0.308,
	              "y": 0.235
	            },
	            "transition": {
	              "in": "slideLeft"
	            },
	            "position": "center",
	            "fit": "none"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">+1 234 456 789</p>",
	              "css": "p { color: #ffffff; font-size: 38px; font-family: Clear Sans; text-align: center; }",
	              "width": 620,
	              "height": 89
	            },
	            "start": 39.4,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0.304,
	              "y": -0.148
	            },
	            "position": "center",
	            "transition": {
	              "in": "slideUp"
	            },
	            "length": 3.6
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">email@email.com</p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: Clear Sans; text-align: center; }",
	              "width": 620,
	              "height": 82
	            },
	            "start": 39.5,
	            "transition": {
	              "in": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0.304,
	              "y": -0.209
	            },
	            "position": "center",
	            "length": 3.5
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Western Cape</p>",
	              "css": "p { color: #fff; font-size: 38px; font-family: Quicksand; text-align: left; }",
	              "width": 1200,
	              "height": 50
	            },
	            "start": 1.3,
	            "length": 4.5,
	            "position": "center",
	            "offset": {
	              "x": -0.062,
	              "y": -0.41
	            },
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            },
	            "fit": "none",
	            "scale": 1
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Lorem ipsum dolor sit amet consectetur adipisicing elit. Perferendis, quas.</p>",
	              "css": "p { color: #fff; font-size: 36px; font-family: Quicksand; text-align: left; }",
	              "width": 1000,
	              "height": 100,
	              "position": "top"
	            },
	            "start": 7.1,
	            "length": 5,
	            "position": "center",
	            "offset": {
	              "x": -0.13,
	              "y": -0.36
	            },
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            },
	            "fit": "none",
	            "scale": 1
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Lorem ipsum dolor sit amet consectetur adipisicing elit. Perferendis, quas.</p>",
	              "css": "p { color: #fff; font-size: 36px; font-family: Quicksand; text-align: left; }",
	              "width": 1000,
	              "height": 100,
	              "position": "top"
	            },
	            "start": 14.3,
	            "length": 5,
	            "position": "center",
	            "offset": {
	              "x": -0.13,
	              "y": -0.36
	            },
	            "transition": {
	              "in": "slideUp",
	              "out": "fade"
	            },
	            "fit": "none",
	            "scale": 1
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Lorem ipsum dolor sit amet consectetur adipisicing elit. Perferendis, quas.</p>",
	              "css": "p { color: #fff; font-size: 36px; font-family: Quicksand; text-align: left; }",
	              "width": 1000,
	              "height": 100,
	              "position": "top"
	            },
	            "start": 22.3,
	            "length": 5,
	            "position": "center",
	            "offset": {
	              "x": -0.13,
	              "y": -0.36
	            },
	            "transition": {
	              "in": "slideUpFast",
	              "out": "fade"
	            },
	            "fit": "none",
	            "scale": 1
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Lorem ipsum dolor sit amet consectetur adipisicing elit. Perferendis, quas.</p>",
	              "css": "p { color: #fff; font-size: 36px; font-family: Quicksand; text-align: left; }",
	              "width": 1000,
	              "height": 100,
	              "position": "top"
	            },
	            "start": 30.3,
	            "length": 5,
	            "position": "center",
	            "offset": {
	              "x": -0.13,
	              "y": -0.36
	            },
	            "transition": {
	              "in": "slideUpFast",
	              "out": "fade"
	            },
	            "fit": "none",
	            "scale": 1
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">JOHN DOE</p>",
	              "css": "p { color: #fff; font-size: 42px; font-family: Clear Sans; text-align: center; }",
	              "width": 424,
	              "height": 86
	            },
	            "start": 39.4,
	            "length": 3.6,
	            "position": "center",
	            "offset": {
	              "x": 0.304,
	              "y": -0.072
	            },
	            "transition": {
	              "in": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-ingest-api-dev-sources.s3.ap-southeast-2.amazonaws.com/z33knba4tb/zzy9j81e-0aqv-vi19-o4sg-0gg43m0jxjan/source.mov"
	            },
	            "start": 0,
	            "length": 5,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-ingest-api-dev-sources.s3.ap-southeast-2.amazonaws.com/z33knba4tb/zzy9j7xj-2ozt-fs03-5466-1oaf6c4r0x6h/source.mov"
	            },
	            "length": 2,
	            "start": 5
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-ingest-api-dev-sources.s3.ap-southeast-2.amazonaws.com/z33knba4tb/zzy9j7wp-2f8p-in0j-ondf-1ii20z4j0j7j/source.mov"
	            },
	            "length": 5,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "start": 38
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://templates.shotstack.io/basic/asset/video/overlay/arrow-sharp/black/content-right-in.mov"
	            },
	            "start": 38,
	            "length": 5
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-entrance.mp4"
	            },
	            "start": 0,
	            "length": 6,
	            "transition": {
	              "in": "fade"
	            },
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-living-room-b-roll.mp4",
	              "trim": 5
	            },
	            "start": 6,
	            "length": 3
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-living-room.mp4"
	            },
	            "start": 9,
	            "length": 5,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-main-bedroom-b-roll.mp4"
	            },
	            "start": 14,
	            "length": 3
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-main-bedroom.mp4"
	            },
	            "start": 17,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-second-bedroom-b-roll.mp4"
	            },
	            "start": 22,
	            "length": 3
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-second-bedroom.mp4"
	            },
	            "start": 25,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-home-office-b-roll.mp4"
	            },
	            "start": 30,
	            "length": 3
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/property-tour-home-office.mp4"
	            },
	            "start": 33,
	            "length": 10
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "size": {
	      "width": 1920,
	      "height": 1080
	    }
	  }
	} as IDataObject,
	// Hotel or Travel Slideshow — source: hotel-review-slideshow
	hotelReviewSlideshow: {
	  "timeline": {
	    "soundtrack": {
	      "src": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/unminus/waveform.mp3"
	    },
	    "background": "#000000",
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Grand Pacific Hotel</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat ExtraBold }",
	              "width": 1200,
	              "height": 600
	            },
	            "start": 0,
	            "length": 4,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideUp",
	              "out": "slideDown"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://cdn.pixabay.com/photo/2018/10/28/10/52/imatra-3778397_960_720.jpg"
	            },
	            "start": 0,
	            "length": 5,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "scale": 1
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>The room was clean and the breakfast is good</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 216
	            },
	            "start": 5,
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideDown",
	              "out": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Kim, Thailand</p>",
	              "css": "p { color: #ffffff; font-size: 36px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 102
	            },
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideDown",
	              "out": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": -0.155
	            },
	            "position": "center",
	            "start": 5.1
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg"
	            },
	            "start": 4,
	            "length": 5,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "fit": "crop",
	            "scale": 1
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/2789328/pexels-photo-2789328.jpeg"
	            },
	            "start": 8,
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center",
	            "fit": "crop",
	            "scale": 1
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Staff were very accommodating</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 216
	            },
	            "start": 11,
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideDown",
	              "out": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Charles, Australia</p>",
	              "css": "p { color: #ffffff; font-size: 36px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 102
	            },
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideRight"
	            },
	            "start": 11.1,
	            "offset": {
	              "x": 0,
	              "y": -0.148
	            },
	            "fit": "none",
	            "scale": 1,
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/2696064/pexels-photo-2696064.jpeg"
	            },
	            "start": 10,
	            "length": 6,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/3771087/pexels-photo-3771087.jpeg"
	            },
	            "effect": "zoomIn",
	            "start": 15,
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            },
	            "length": 3,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Highly recommended. I would definitely stay here again!</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 216
	            },
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideDown",
	              "out": "slideUp"
	            },
	            "start": 17,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Gabe, United Kingdom</p>",
	              "css": "p { color: #ffffff; font-size: 36px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 102
	            },
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideDown",
	              "out": "slideUp"
	            },
	            "start": 17.1,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": -0.004,
	              "y": -0.155
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/6394711/pexels-photo-6394711.jpeg"
	            },
	            "effect": "zoomIn",
	            "start": 17,
	            "length": 5,
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://cdn.pixabay.com/photo/2018/11/09/13/00/furniture-3804535_960_720.jpg"
	            },
	            "effect": "zoomIn",
	            "start": 21,
	            "length": 2,
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Great experience. Strongly recommended</p>",
	              "css": "p { color: #ffffff; font-size: 60px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 216
	            },
	            "start": 23,
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideUp"
	            },
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Peter, United States</p>",
	              "css": "p { color: #ffffff; font-size: 36px; font-family: Montserrat ExtraBold }",
	              "width": 1400,
	              "height": 102
	            },
	            "length": 3,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideUp"
	            },
	            "start": 23.1,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": -0.148
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://cdn.pixabay.com/photo/2016/11/14/02/28/apartment-1822409_960_720.jpg"
	            },
	            "start": 22,
	            "length": 5,
	            "effect": "zoomIn",
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type='text'>Book Now</p>",
	              "css": "p { color: #ffffff; font-size: 72px; font-family: Montserrat ExtraBold }",
	              "width": 800,
	              "height": 200
	            },
	            "start": 25.8,
	            "length": 4.2,
	            "effect": "zoomIn",
	            "transition": {
	              "in": "slideUp"
	            }
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "size": {
	      "width": 1920,
	      "height": 1080
	    }
	  }
	} as IDataObject,
	// Kinetic Text — source: kinetic-text
	kineticText: {
	  "timeline": {
	    "soundtrack": {
	      "src": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/private/stomp.wav",
	      "effect": "fadeOut"
	    },
	    "fonts": [
	      {
	        "src": "https://shotstack-ingest-api-v1-sources.s3.ap-southeast-2.amazonaws.com/wzr6y0wtti/zzy9j8yn-3h5d-xe4d-dw0k-2aiu8d2pqyxh/source.ttf"
	      },
	      {
	        "src": "https://shotstack-ingest-api-v1-sources.s3.ap-southeast-2.amazonaws.com/wzr6y0wtti/zzy9j8yc-1cni-mt2w-3ogs-2gvxce3gghhu/source.ttf"
	      },
	      {
	        "src": "https://shotstack-ingest-api-v1-sources.s3.ap-southeast-2.amazonaws.com/wzr6y0wtti/zzy9j8y4-0vs9-oy0p-yab2-084jou1b6m1s/source.ttf"
	      }
	    ],
	    "background": "#000000",
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>Create</p>",
	              "css": "p { font-family: \"Lato\"; color: #ffffff; font-size: 30px; text-align: center; font-weight: bold;    }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 0.096,
	            "length": 0.6,
	            "transition": {
	              "in": "zoom"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>videos</p>",
	              "css": "p { font-family: \"Lato\"; color: #ffffff; font-size: 30px; text-align: center; font-weight: bold;    }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 0.72,
	            "length": 0.62
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>using</p>",
	              "css": "p { font-family: \"Lato\"; color: #ffffff; font-size: 30px; text-align: center; font-weight: bold;    }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 1.38,
	            "length": 0.22
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">using html</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 1.64,
	            "length": 0.31
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">using html and</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 1.99,
	            "length": 0.26
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">using html and css</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 2.29,
	            "length": 0.31
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">with</p>",
	              "css": "p { color: #000000; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 2.64,
	            "length": 0.56,
	            "transition": {
	              "in": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">the</p>",
	              "css": "p { color: #000000; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 3.24,
	            "length": 0.68
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">Shotstack</p>",
	              "css": "p { color: #ffffff; font-size: 34px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 3.98,
	            "length": 0.54,
	            "effect": "zoomIn"
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">API</p>",
	              "css": "p { color: #000000; font-size: 38px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 4.56,
	            "length": 0.6,
	            "transition": {
	              "in": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">AP</p>",
	              "css": "p { color: #000000; font-size: 38px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 5.2,
	            "length": 0.04
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">I</p>",
	              "css": "p { color: #000000; font-size: 38px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 5.28,
	            "length": 0.04
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">use</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 5.36,
	            "length": 0.22
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">your</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 5.62,
	            "length": 0.22
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">own</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 5.86,
	            "length": 0.22
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">font</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 6.12,
	            "length": 0.2
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">font</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Permanent Marker; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 6.36,
	            "length": 0.26,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">and</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 6.66,
	            "length": 0.3
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">add</p>",
	              "css": "p { color: #ffffff; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 7,
	            "length": 0.46
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">color</p>",
	              "css": "p { color: #25d3d0; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 7.5,
	            "length": 0.3
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">color and</p>",
	              "css": "p { color: #25d3d0; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 7.84,
	            "length": 0.4
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">color and style</p>",
	              "css": "p { color: #fc73b4; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 8.28,
	            "length": 0.38
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">color and style</p>",
	              "css": "p { color: #72fdd3; font-size: 30px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 8.7,
	            "length": 0.38
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">to</p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: Lato; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 9.12,
	            "length": 0.62,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>one</p>",
	              "css": "p { font-family: \"Lato\"; color: #ffffff; font-size: 32px; text-align: center; font-weight: bold;    }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 9.78,
	            "length": 0.58
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">ten</p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: \"Lato\"; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 10.4,
	            "length": 0.26
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">hundreds</p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: \"Lato\"; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 10.7,
	            "length": 0.26
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p data-html-type=\"text\">thousands</p>",
	              "css": "p { color: #ffffff; font-size: 32px; font-family: \"Lato\"; text-align: center; }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 11,
	            "length": 0.58
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>of</p>",
	              "css": "p { font-family: \"Lato\"; color: #000000; font-size: 34px; text-align: center; font-weight: bold;    }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 11.62,
	            "length": 0.18
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>videos</p>",
	              "css": "p { font-family: \"Lato\"; color: #000000; font-size: 34px; text-align: center; font-weight: bold;    }",
	              "width": 450,
	              "height": 100,
	              "position": "center"
	            },
	            "start": 11.84,
	            "length": 1,
	            "effect": "zoomIn",
	            "transition": {
	              "out": "zoom"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>&nbsp;</p>",
	              "width": 1024,
	              "height": 576,
	              "background": "#ffffff"
	            },
	            "start": 2.64,
	            "length": 1.32
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>&nbsp;</p>",
	              "width": 1024,
	              "height": 576,
	              "background": "#ffffff"
	            },
	            "start": 4.56,
	            "length": 0.76
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>&nbsp;</p>",
	              "width": 1024,
	              "height": 576,
	              "background": "#25d3d0"
	            },
	            "start": 9.12,
	            "length": 2.46,
	            "fit": "none",
	            "scale": 1,
	            "offset": {
	              "x": 0,
	              "y": 0
	            },
	            "position": "center"
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>&nbsp;</p>",
	              "width": 1024,
	              "height": 576,
	              "background": "#fc73b4"
	            },
	            "start": 11.62,
	            "length": 1.22
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/branding/logo-reverse.png"
	            },
	            "start": 12.88,
	            "length": 4,
	            "fit": "none",
	            "transition": {
	              "in": "slideUp"
	            }
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "size": {
	      "width": 1024,
	      "height": 576
	    }
	  }
	} as IDataObject,
	// News Summary Video — source: info-news-summary-video — placeholders: HIGHLITE_COLOR, LOWER_THIRD_PANEL
	infoNewsSummaryVideo: {
	  "merge": [
	    {
	      "find": "LOWER_THIRD_PANEL",
	      "replace": "https://templates.shotstack.io/basic/asset/image/overlay/slanted-panel-cyan-highlite.png"
	    },
	    {
	      "find": "HIGHLITE_COLOR",
	      "replace": "#00f4e9"
	    }
	  ],
	  "timeline": {
	    "soundtrack": {
	      "src": "https://assets.mixkit.co/music/download/mixkit-driving-ambition-32.mp3",
	      "effect": "fadeOut"
	    },
	    "fonts": [
	      {
	        "src": "https://templates.shotstack.io/basic/asset/font/roboto-bold.ttf"
	      }
	    ],
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>It's estimated global temperatures will rise <u>1.5 degrees Celcius</u> in the next 2 decades.</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: #ffffff; font-size: 46px; text-align: left;} u { color: {{HIGHLITE_COLOR}}; text-decoration: none; }",
	              "width": 960,
	              "height": 120
	            },
	            "start": 0.5,
	            "length": 4.5,
	            "position": "bottomLeft",
	            "offset": {
	              "x": 0.03,
	              "y": 0.135
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>The last <u>10 years</u> have been the warmest on record.</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: #ffffff; font-size: 46px; text-align: left; } u { color: {{HIGHLITE_COLOR}}; text-decoration: none; }",
	              "width": 960,
	              "height": 120
	            },
	            "start": 5.5,
	            "length": 4.5,
	            "position": "bottomLeft",
	            "offset": {
	              "x": 0.03,
	              "y": 0.135
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>More than <u>1 million</u> species are at risk of extinction by climate change.</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: #ffffff; font-size: 46px; text-align: left; } u { color: {{HIGHLITE_COLOR}}; text-decoration: none; }",
	              "width": 960,
	              "height": 120
	            },
	            "start": 10.5,
	            "length": 4.5,
	            "position": "bottomLeft",
	            "offset": {
	              "x": 0.03,
	              "y": 0.135
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>Climate change is <u>detrimental to human life</u> and it's already happening.</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: #ffffff; font-size: 46px; text-align: left; } u { color: {{HIGHLITE_COLOR}}; text-decoration: none; }",
	              "width": 960,
	              "height": 120
	            },
	            "start": 15.5,
	            "length": 4.5,
	            "position": "bottomLeft",
	            "offset": {
	              "x": 0.03,
	              "y": 0.135
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>Many world leaders still aren't taking it <u>seriously</u>.</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: #ffffff; font-size: 44px; text-align: left; } u { color: {{HIGHLITE_COLOR}}; text-decoration: none; }",
	              "width": 960,
	              "height": 120
	            },
	            "start": 20.5,
	            "length": 4.5,
	            "position": "bottomLeft",
	            "offset": {
	              "x": 0.03,
	              "y": 0.135
	            },
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>LIKE</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: {{HIGHLITE_COLOR}}; font-size: 44px; text-align: center;}",
	              "width": 800,
	              "height": 200
	            },
	            "start": 25.5,
	            "length": 0.8,
	            "transition": {
	              "in": "slideDown",
	              "out": "slideDown"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>COMMENT</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: {{HIGHLITE_COLOR}}; font-size: 44px; text-align: center; }",
	              "width": 800,
	              "height": 200
	            },
	            "start": 26.3,
	            "length": 0.8,
	            "transition": {
	              "in": "slideDown",
	              "out": "slideDown"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>SHARE</p>",
	              "css": "p { font-family: 'Roboto'; font-weight: bold; color: {{HIGHLITE_COLOR}}; font-size: 44px; text-align: center; margin: 50px;}",
	              "width": 800,
	              "height": 200
	            },
	            "start": 27.1,
	            "length": 0.8,
	            "transition": {
	              "in": "slideDown",
	              "out": "slideDown"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{LOWER_THIRD_PANEL}}"
	            },
	            "scale": 0.24,
	            "position": "bottomLeft",
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            },
	            "offset": {
	              "y": 0.1
	            },
	            "start": 0,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{LOWER_THIRD_PANEL}}"
	            },
	            "scale": 0.25,
	            "position": "bottomLeft",
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            },
	            "offset": {
	              "y": 0.1
	            },
	            "start": 5,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{LOWER_THIRD_PANEL}}"
	            },
	            "scale": 0.25,
	            "position": "bottomLeft",
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            },
	            "offset": {
	              "y": 0.1
	            },
	            "start": 10,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{LOWER_THIRD_PANEL}}"
	            },
	            "scale": 0.25,
	            "position": "bottomLeft",
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            },
	            "offset": {
	              "y": 0.1
	            },
	            "start": 15,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "{{LOWER_THIRD_PANEL}}"
	            },
	            "scale": 0.25,
	            "position": "bottomLeft",
	            "transition": {
	              "in": "slideRight",
	              "out": "slideLeft"
	            },
	            "offset": {
	              "y": 0.1
	            },
	            "start": 20,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/logos/news-white.png"
	            },
	            "fit": "none",
	            "scale": 0.65,
	            "transition": {
	              "in": "slideUp"
	            },
	            "start": 28,
	            "length": 3
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/sun-clouds.mp4"
	            },
	            "start": 0,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/desert-overhead.mp4",
	              "trim": 5
	            },
	            "start": 5,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/lemur-eating.mp4",
	              "trim": 5
	            },
	            "start": 10,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/shanty-town-overhead.mp4",
	              "trim": 5
	            },
	            "start": 15,
	            "length": 5
	          },
	          {
	            "asset": {
	              "type": "video",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/podium-speach.mp4"
	            },
	            "start": 20,
	            "length": 6,
	            "transition": {
	              "out": "fade"
	            }
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "resolution": "hd"
	  }
	} as IDataObject,
	// Health and Wellbeing Advert — source: health-wellbeing-promotion
	healthWellbeingPromotion: {
	  "timeline": {
	    "soundtrack": {
	      "src": "https://feeds.soundcloud.com/stream/267703548-unminus-white.mp3",
	      "effect": "fadeOut"
	    },
	    "fonts": [
	      {
	        "src": "https://templates.shotstack.io/basic/asset/font/raleway-regular.ttf"
	      },
	      {
	        "src": "https://templates.shotstack.io/basic/asset/font/raleway-bold.ttf"
	      }
	    ],
	    "tracks": [
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/logos/heart-health-white.png"
	            },
	            "start": 0.5,
	            "length": 11.2,
	            "fit": "none",
	            "scale": 0.4,
	            "position": "topRight",
	            "offset": {
	              "x": -0.04,
	              "y": -0.05
	            },
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideLeft"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>&nbsp;</p>",
	              "width": 200,
	              "height": 200,
	              "background": "#6666ff"
	            },
	            "start": 0.5,
	            "length": 11.2,
	            "position": "topRight",
	            "offset": {
	              "x": -0.02,
	              "y": -0.02
	            },
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideLeft"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<table class='border' border='0' cellspacing='1'><tbody><tr class='main_title_container'><td width='100%'><p class='title'>Heart Healthcare</p><div class='hair' width='30%'>-</div><p class='location'>HOUSTON, TEXAS</p></td> </tr></tbody></table>",
	              "css": ".main_title_container { background: rgba(0,0,0,0.5); text-align: center; vertical-align: top;} td { padding-top: 24px; padding-bottom: 24px; } .title { font-family: Raleway; font-weight: bold; font-size: 64px; color: #ffffff;} .location {font-family: Raleway; font-size: 40px; color: #ffffff;} .hair { margin-left: 350px; margin-right: 350px; font-size: 2px; width: 100px; height 2px; background: #6666ff; } ",
	              "width": 860,
	              "height": 400
	            },
	            "start": 0.4,
	            "length": 2.3,
	            "offset": {
	              "y": -0.215
	            },
	            "transition": {
	              "in": "slideLeft",
	              "out": "fadeFast"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<table cellpadding='16' border='0' cellspacing='1'><tbody><tr class='main_title_container'><td width='100%'><p>The <span> health care</span> association recommends exercising every day.</p></td></tr></tbody></table>",
	              "css": ".main_title_container { background: rgba(0,0,0,0.5); text-align: center; } p { font-family: Raleway; font-size: 58px; color: #ffffff; }  span { color: #6666ff;}",
	              "width": 860,
	              "height": 400
	            },
	            "start": 2.8,
	            "length": 2.8,
	            "position": "bottom",
	            "transition": {
	              "in": "slideLeft",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<table cellpadding='16' border='0' cellspacing='1'><tbody><tr class='main_title_container'><td width='100%'><p>Just <span>10 minutes</span> of meditation can help you relax and improve sleep.</p></td></tr></tbody></table>",
	              "css": ".main_title_container { background: rgba(0,0,0,0.5); text-align: center;} p { font-family: Raleway; font-size: 58px; color: #ffffff; } span { color: #6666ff;}",
	              "width": 860,
	              "height": 400
	            },
	            "start": 5.6,
	            "length": 3.2,
	            "transition": {
	              "in": "fade",
	              "out": "slideLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<table cellpadding='16' border='0' cellspacing='1'><tbody><tr class='main_title_container'><td width='100%'><p>Eat a <span>healthy mix</span> of fruit, vegetables, carbs and protein.</p></td></tr></tbody></table>",
	              "css": ".main_title_container { background: rgba(0,0,0,0.5); text-align: center;} p { font-family: Raleway; font-size: 58px; color: #ffffff; } span { color: #6666ff; }",
	              "width": 860,
	              "height": 400,
	              "position": "bottom"
	            },
	            "start": 8.4,
	            "length": 3.2,
	            "transition": {
	              "in": "carouselLeft",
	              "out": "slideLeft"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/logos/heart-health-white.png"
	            },
	            "start": 12,
	            "length": 3,
	            "scale": 0.85,
	            "fit": "none",
	            "transition": {
	              "in": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "html",
	              "html": "<div>heart.co</div>",
	              "css": "div {font-family: Raleway; text-align: center; color:#ffffff; font-size: 32px;}",
	              "width": 800,
	              "height": 100
	            },
	            "start": 12.9,
	            "length": 2.1,
	            "offset": {
	              "y": -0.35
	            },
	            "transition": {
	              "in": "slideUp"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "html",
	              "html": "<p>&nbsp;</p>",
	              "width": 1080,
	              "height": 1080,
	              "background": "#6666ff"
	            },
	            "start": 11.4,
	            "length": 3.6,
	            "transition": {
	              "in": "carouselLeft"
	            }
	          }
	        ]
	      },
	      {
	        "clips": [
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/1112633/pexels-photo-1112633.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260"
	            },
	            "start": 0,
	            "length": 3,
	            "effect": "zoomInSlow",
	            "transition": {
	              "in": "fade",
	              "out": "fade"
	            }
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/2475878/pexels-photo-2475878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260"
	            },
	            "start": 2.4,
	            "length": 3.65,
	            "effect": "slideLeftSlow",
	            "transition": {
	              "in": "carouselLeft",
	              "out": "carouselLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/6787498/pexels-photo-6787498.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260"
	            },
	            "start": 5.4,
	            "length": 3.6,
	            "effect": "zoomInSlow",
	            "transition": {
	              "in": "carouselLeft",
	              "out": "carouselLeft"
	            }
	          },
	          {
	            "asset": {
	              "type": "image",
	              "src": "https://images.pexels.com/photos/1153370/pexels-photo-1153370.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260"
	            },
	            "start": 8.4,
	            "length": 3.6,
	            "effect": "zoomOutSlow",
	            "transition": {
	              "in": "slideLeft",
	              "out": "carouselLeft"
	            }
	          }
	        ]
	      }
	    ]
	  },
	  "output": {
	    "format": "mp4",
	    "resolution": "1080",
	    "aspectRatio": "1:1"
	  }
	} as IDataObject,
};
