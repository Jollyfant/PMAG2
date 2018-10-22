const TIME_SCALE_AGES = {
	"Unknown": {
		"min": "",
		"max": "",
        "level": 0
	},
	"Quaternary": {
		"min": 0,
		"max": 2.6,
        "level": 0
	},
	"Holocene": {
		"min": 0,
		"max": 0.01,
        "level": 1
	},
	"Pleistocene": {
		"min": 0.01,
		"max": 2.6,
        "level": 1
	},
	"Neogene": {
		"min": 2.6,
		"max": 23.0,
        "level": 0
	},
	"Pliocene": {
		"min": 2.6,
		"max": 5.3,
        "level": 1
	},
	"Piacenzian": {
		"min": 2.6,
		"max": 3.6,
        "level": 3
	},
	"Zanclean": {
		"min": 3.6,
		"max": 5.3,
        "level": 3
	},
	"Miocene": {
		"min": 5.3,
		"max": 23.0,
        "level": 1
	},
	"Late Miocene": {
		"min": 5.3,
		"max": 11.7,
        "level": 2
	},
	"Messinian": {
		"min": 5.3,
		"max": 7.2,
        "level": 3
	},
	"Tortonian": {
		"min": 7.2,
		"max": 11.7,
        "level": 3
	},
	"Middle Miocene": {
		"min": 11.7,
		"max": 16.0,
        "level": 2
	},
	"Serravallian": {
		"min": 11.7,
		"max": 13.8,
        "level": 3
	},
	"Langhian": {
		"min": 13.8,
		"max": 16.0,
        "level": 3
	},
	"Early Miocene": {
		"min": 16.0,
		"max": 23.0,
        "level": 2
	},
	"Burdigalian": {
		"min": 16.0,
		"max": 20.4,
        "level": 3
	},
	"Aquitanian": {
		"min": 20.4,
		"max": 23.0,
        "level": 3
	},
	"Paleogene": {
		"min": 23.0,
		"max": 66.0,
        "level": 0
	},
	"Oligocene": {
		"min": 23.0,
		"max": 33.9,
        "level": 1
	},
	"Late Oligocene": {
		"min": 23.0,
		"max": 28.1,
        "level": 2
	},
	"Chattian": {
		"min": 23.0,
		"max": 28.1,
        "level": 3
	},
	"Early Oligocene": {
		"min": 28.1,
		"max": 33.9,
        "level": 2
	},
	"Rupelian": {
		"min": 28.1,
		"max": 33.9,
        "level": 3
	},
	"Eocene": {
		"min": 33.9,
		"max": 56.0,
        "level": 1
	},
	"Late Eocene": {
		"min": 33.9,
		"max": 38.0,
        "level": 2
	},
	"Priabonian": {
		"min": 33.9,
		"max": 38.0,
        "level": 3
	},
	"Middle Eocene": {
		"min": 38.0,
		"max": 47.8,
        "level": 2
	},
	"Bartonian": {
		"min": 38.0,
		"max": 41.3,
        "level": 3
	},
	"Lutetian": {
		"min": 41.3,
		"max": 47.8,
        "level": 3
	},
	"Early Eocene": {
		"min": 47.8,
		"max": 56.0,
        "level": 2
	},
	"Ypresian": {
		"min": 47.8,
		"max": 56.0,
        "level": 3
	},
	"Paleocene": {
		"min": 56.0,
		"max": 66.0,
        "level": 1
	},
	"Late Paleocene": {
		"min": 56.0,
		"max": 59.2,
        "level": 2
	},
	"Thanetian": {
		"min": 56.0,
		"max": 59.2,
        "level": 3
	},
	"Middle Paleocene": {
		"min": 59.2,
		"max": 61.6,
        "level": 2
	},
	"Selandian": {
		"min": 59.2,
		"max": 61.6,
        "level": 3
	},
	"Early Paleocene": {
		"min": 61.6,
		"max": 66.0,
        "level": 2
	},
	"Danian": {
		"min": 61.6,
		"max": 66.0,
        "level": 3
	},
	"Cretaceous": {
		"min": 66.0,
		"max": 145,
        "level": 0
	},
	"Late Cretaceous": {
		"min": 66.0,
		"max": 100,
        "level": 1
	},
	"Maastrichtian": {
		"min": 66.0,
		"max": 72.1,
        "level": 3
	},
	"Campanian": {
		"min": 72.1,
		"max": 83.6,
        "level": 3
	},
	"Santonian": {
		"min": 83.6,
		"max": 86.3,
        "level": 3
	},
	"Coniacian": {
		"min": 86.3,
		"max": 89.8,
        "level": 3
	},
	"Turonian": {
		"min": 89.8,
		"max": 93.9,
        "level": 3
	},
	"Cenomanian": {
		"min": 93.9,
		"max": 100,
        "level": 3
	},
	"Early Cretaceous": {
		"min": 100,
		"max": 145,
        "level": 1
	},
	"Albian": {
		"min": 100,
		"max": 113,
        "level": 3
	},
	"Aptian": {
		"min": 113,
		"max": 125,
        "level": 3
	},
	"Barremian": {
		"min": 125,
		"max": 129,
        "level": 3
	},
	"Hauterivian": {
		"min": 129,
		"max": 133,
        "level": 3
	},
	"Valanginian": {
		"min": 133,
		"max": 140,
        "level": 3
	},
	"Berriasian": {
		"min": 140,
		"max": 145,
        "level": 3
	},
	"Jurassic": {
		"min": 145,
		"max": 201,
        "level": 0
	},
	"Late Jurassic": {
		"min": 145,
		"max": 164,
        "level": 1
	},
	"Tithonian": {
		"min": 145,
		"max": 152,
        "level": 3
	},
	"Kimmeridgian": {
		"min": 152,
		"max": 157,
        "level": 3
	},
	"Oxfordian": {
		"min": 157,
		"max": 164,
        "level": 3
	},
	"Middle Jurassic": {
		"min": 164,
		"max": 174,
        "level": 1
	},
	"Callovian": {
		"min": 164,
		"max": 166,
        "level": 3
	},
	"Bathonian": {
		"min": 166,
		"max": 168,
        "level": 3
	},
	"Bajocian": {
		"min": 168,
		"max": 170,
        "level": 3
	},
	"Aalenian": {
		"min": 170,
		"max": 174,
        "level": 3
	},
	"Early Jurassic": {
		"min": 174,
		"max": 201,
        "level": 1
	},
	"Toarcian": {
		"min": 174,
		"max": 183,
        "level": 3
	},
	"Pliensbachian": {
		"min": 183,
		"max": 191,
        "level": 3
	},
	"Sinemurian": {
		"min": 191,
		"max": 199,
        "level": 3
	},
	"Hettangian": {
		"min": 199,
		"max": 201,
        "level": 3
	},
	"Triassic": {
		"min": 201,
		"max": 252,
        "level": 0
	},
	"Late Triassic": {
		"min": 201,
		"max": 235,
        "level": 1
	},
	"Rhaetian": {
		"min": 201,
		"max": 209,
        "level": 3
	},
	"Norian": {
		"min": 209,
		"max": 228,
        "level": 3
	},
	"Carnian": {
		"min": 228,
		"max": 235,
        "level": 3
	},
	"Middle Triassic": {
		"min": 235,
		"max": 247,
        "level": 1
	},
	"Ladinian": {
		"min": 235,
		"max": 242,
        "level": 3
	},
	"Anisian": {
		"min": 242,
		"max": 247,
        "level": 3
	},
	"Early Triassic": {
		"min": 247,
		"max": 252,
        "level": 1
	},
	"Olenekian": {
		"min": 247,
		"max": 251,
        "level": 3
	},
	"Induan": {
		"min": 251,
		"max": 252,
        "level": 3
	},
	"Permian": {
		"min": 252,
		"max": 299,
        "level": 0
	},
	"Lopingian": {
		"min": 252,
		"max": 260,
        "level": 1
	},
	"Changhsingian": {
		"min": 252,
		"max": 254,
        "level": 3
	},
	"Wuchiapingian": {
		"min": 254,
		"max": 260,
        "level": 3
	},
	"Guadalupian": {
		"min": 260,
		"max": 272,
        "level": 1
	},
	"Capitanian": {
		"min": 260,
		"max": 265,
        "level": 3
	},
	"Wordian": {
		"min": 265,
		"max": 269,
        "level": 3
	},
	"Roadian": {
		"min": 269,
		"max": 272,
        "level": 3
	},
	"Cisuralian": {
		"min": 272,
		"max": 299,
        "level": 1
	},
	"Kungurian": {
		"min": 272,
		"max": 279,
        "level": 3
	},
	"Artinskian": {
		"min": 279,
		"max": 290,
        "level": 3
	},
	"Sakmarian": {
		"min": 290,
		"max": 295,
        "level": 3
	},
	"Asselian": {
		"min": 295,
		"max": 299,
        "level": 3
	},
	"Carboniferous": {
		"min": 299,
		"max": 359,
        "level": 0
	},
	"Pennsylvanian": {
		"min": 299,
		"max": 304,
        "level": 1
	},
	"Upper Pennsylvanian": {
		"min": 299,
		"max": 307,
        "level": 2
	},
	"Gzhelian": {
		"min": 299,
		"max": 304,
        "level": 3
	},
	"Kasimovian": {
		"min": 304,
		"max": 307,
        "level": 3
	},
	"Middle Pennsylvanian": {
		"min": 307,
		"max": 315,
        "level": 2
	},
	"Moscovian": {
		"min": 307,
		"max": 315,
        "level": 3
	},
	"Lower Pennsylvanian": {
		"min": 315,
		"max": 323,
        "level": 2
	},
	"Bashkirian": {
		"min": 315,
		"max": 323,
        "level": 3
	},
	"Mississippian": {
		"min": 323,
		"max": 359,
        "level": 1
	},
	"Upper Mississippian": {
		"min": 323,
		"max": 331,
        "level": 2
	},
	"Serpukhobian": {
		"min": 323,
		"max": 331,
        "level": 3
	},
	"Middle Mississippian": {
		"min": 331,
		"max": 347,
        "level": 2
	},
	"Visean": {
		"min": 331,
		"max": 347,
        "level": 3
	},
	"Lower Mississippian": {
		"min": 347,
		"max": 359,
        "level": 2
	},
	"Tournaisian": {
		"min": 347,
		"max": 359,
        "level": 3
	},
	"Devonian": {
		"min": 359,
		"max": 419,
        "level": 0
	},
	"Upper Devonian": {
		"min": 359,
		"max": 383,
        "level": 1
	},
	"Famennian": {
		"min": 359,
		"max": 372,
        "level": 3
	},
	"Frasnian": {
		"min": 372,
		"max": 383,
        "level": 3
	},
	"Middle Devonian": {
		"min": 383,
		"max": 393,
        "level": 1
	},
	"Givetian": {
		"min": 383,
		"max": 388,
        "level": 3
	},
	"Eifelian": {
		"min": 388,
		"max": 393,
        "level": 3
	},
	"Lower Devonian": {
		"min": 393,
		"max": 419,
        "level": 1
	},
	"Emsian": {
		"min": 393,
		"max": 408,
        "level": 3
	},
	"Pragian": {
		"min": 408,
		"max": 411,
        "level": 3
	},
	"Lochkovian": {
		"min": 411,
		"max": 419,
        "level": 3
	},
	"Silurian": {
		"min": 419,
		"max": 444,
        "level": 0
	},
	"Pridoli": {
		"min": 419,
		"max": 423,
        "level": 1
	},
	"Ludlow": {
		"min": 423,
		"max": 427,
        "level": 1
	},
	"Ludfordian": {
		"min": 423,
		"max": 426,
        "level": 3
	},
	"Gorstian": {
		"min": 426,
		"max": 427,
        "level": 3
	},
	"Wenlock": {
		"min": 427,
		"max": 433,
        "level": 1
	},
	"Homerian": {
		"min": 427,
		"max": 431,
        "level": 3
	},
	"Sheinwoodian": {
		"min": 431,
		"max": 433,
        "level": 3
	},
	"Llandovery": {
		"min": 433,
		"max": 444,
        "level": 1
	},
	"Telychian": {
		"min": 433,
		"max": 439,
        "level": 3
	},
	"Aeronian": {
		"min": 439,
		"max": 441,
        "level": 3
	},
	"Rhuddanian": {
		"min": 441,
		"max": 444,
        "level": 3
	},
	"Ordovician": {
		"min": 444,
		"max": 485,
        "level": 0
	},
	"Upper Ordivician": {
		"min": 444,
		"max": 458,
        "level": 1
	},
	"Hirnantian": {
		"min": 444,
		"max": 445,
        "level": 3
	},
	"Katian": {
		"min": 445,
		"max": 453,
        "level": 3
	},
	"Sandbian": {
		"min": 453,
		"max": 458,
        "level": 3
	},
	"Middle Ordovician": {
		"min": 458,
		"max": 470,
        "level": 1
	},
	"Darriwilian": {
		"min": 458,
		"max": 467,
        "level": 3
	},
	"Dapingian": {
		"min": 467,
		"max": 470,
        "level": 3
	},
	"Lower Ordovician": {
		"min": 470,
		"max": 485,
        "level": 1
	},
	"Floian": {
		"min": 470,
		"max": 478,
        "level": 3
	},
	"Tremadocian": {
		"min": 478,
		"max": 485,
        "level": 3
	},
	"Cambrian": {
		"min": 485,
		"max": 541,
        "level": 0
	},
	"Furongian": {
		"min": 485,
		"max": 497,
        "level": 1
	},
	"Stage 10": {
		"min": 485,
		"max": 490,
        "level": 3
	},
	"Jiangshanian": {
		"min": 490,
		"max": 494,
        "level": 3
	},
	"Paibian": {
		"min": 494,
		"max": 497,
        "level": 3
	},
	"Series 3": {
		"min": 497,
		"max": 509,
        "level": 1
	},
	"Guzhangian": {
		"min": 497,
		"max": 501,
        "level": 3
	},
	"Drumian": {
		"min": 501,
		"max": 505,
        "level": 3
	},
	"Stage 5": {
		"min": 505,
		"max": 509,
        "level": 3
	},
	"Series 2": {
		"min": 509,
		"max": 521,
        "level": 1
	},
	"Stage 4": {
		"min": 509,
		"max": 514,
        "level": 3
	},
	"Stage 3": {
		"min": 514,
		"max": 521,
        "level": 3
	},
	"Terreneuvian": {
		"min": 521,
		"max": 541,
        "level": 1
	},
	"Stage 2": {
		"min": 521,
		"max": 529,
        "level": 3
	},
	"Fortunian": {
		"min": 529,
		"max": 541,
        "level": 3
	}
}

function addAges() {

  /*
   * Function addPrototypeSelection
   * Adds a prototype to the user prototype selection box
   */

  Object.keys(TIME_SCALE_AGES).forEach(function(age) {

    var option = document.createElement("option");

    var indent = "\xA0\xA0".repeat(TIME_SCALE_AGES[age].level);
    option.text = indent + age;
    option.value = age;

    document.getElementById("specimen-age-select").add(option);

  });

}

document.getElementById("specimen-age-select").addEventListener("change", function(event) {

  var value = event.target.value;

  var min = TIME_SCALE_AGES[value].min;
  var max = TIME_SCALE_AGES[value].max;
  var average = 0.5 * (min + max) || "";

  document.getElementById("age-input").value = average;
  document.getElementById("age-min-input").value = min
  document.getElementById("age-max-input").value = max;

});

addAges();