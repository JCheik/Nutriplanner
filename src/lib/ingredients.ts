export interface BaseIngredient {
  name: string;
  // per 100g or 100ml
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
}

/**
 * ¡AQUÍ VA TU BASE DE DATOS DE ALIMENTOS!
 * 
 * Para añadir tus alimentos desde un Excel:
 * 1. Asegúrate de que tu Excel tiene las columnas: name, calories, protein, carbs, fat, unit.
 * 2. Usa un conversor online (busca "Excel a JSON") para convertir tu archivo.
 * 3. Copia el resultado del conversor.
 * 4. Pega el contenido copiado aquí, reemplazando los datos de ejemplo de abajo.
 * 
 * Ejemplo de formato:
 * [
 *   { "name": "Pechuga de Pollo", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "unit": "g" },
 *   { "name": "Arroz Blanco", "calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "unit": "g" }
 * ]
 */
export const ingredientsDB: BaseIngredient[] = [
    {
      "name": "Albahaca fresca",
      "calories": 25,
      "protein": 2.5,
      "carbs": 0.44,
      "sugar": 0.1,
      "fiber": 3.9,
      "fat": 0.61
    },
    {
      "name": "Albahaca seca",
      "calories": 256,
      "protein": 14.4,
      "carbs": 20.5,
      "sugar": 18.8,
      "fiber": 40.5,
      "fat": 3.98
    },
    {
      "name": "Alcaparra",
      "calories": 44,
      "protein": 2.4,
      "carbs": 4,
      "sugar": 4.9,
      "fiber": 3.2,
      "fat": 0.9
    },
    {
      "name": "Alcaravera, semillas",
      "calories": 486,
      "protein": 19.8,
      "carbs": 49.9,
      "sugar": 0.64,
      "fiber": 38,
      "fat": 14.59
    },
    {
      "name": "Alioli",
      "calories": 796,
      "protein": 0.5,
      "carbs": 2.8,
      "sugar": 0.3,
      "fiber": 0.1,
      "fat": 86.9
    },
    {
      "name": "Ajo en Polvo",
      "calories": 331,
      "protein": 16.6,
      "carbs": 72.7,
      "sugar": 2.43,
      "fiber": 9,
      "fat": 0.73
    },
    {
      "name": "Azafrán",
      "calories": 345,
      "protein": 11.4,
      "carbs": 61.5,
      "sugar": 42.4,
      "fiber": 30,
      "fat": 5.9
    },
    {
      "name": "Caldo en cubitos",
      "calories": 207,
      "protein": 20.2,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 14
    },
    {
      "name": "Canela molida",
      "calories": 44,
      "protein": 3.9,
      "carbs": 3.2,
      "sugar": 0,
      "fiber": 0,
      "fat": 3.2
    },
    {
      "name": "Cardamomo, semillas",
      "calories": 433,
      "protein": 10.8,
      "carbs": 68.5,
      "sugar": 0,
      "fiber": 28,
      "fat": 6.7
    },
    {
      "name": "Cebolla deshidratada en copos",
      "calories": 391,
      "protein": 9,
      "carbs": 83.3,
      "sugar": 37.41,
      "fiber": 9.2,
      "fat": 0.46
    },
    {
      "name": "Chile Jalapeño",
      "calories": 27,
      "protein": 1.2,
      "carbs": 5.3,
      "sugar": 0,
      "fiber": 0,
      "fat": 0.1
    },
    {
      "name": "Chile picante",
      "calories": 4,
      "protein": 1.9,
      "carbs": 8,
      "sugar": 0,
      "fiber": 0,
      "fat": 0.6
    },
    {
      "name": "Cilantro fresco",
      "calories": 57,
      "protein": 3.3,
      "carbs": 8,
      "sugar": 0,
      "fiber": 2.8,
      "fat": 0.7
    },
    {
      "name": "Clavo",
      "calories": 454,
      "protein": 6,
      "carbs": 57.4,
      "sugar": 0,
      "fiber": 9.6,
      "fat": 20.1
    },
    {
      "name": "Comino",
      "calories": 438,
      "protein": 17.8,
      "carbs": 45.4,
      "sugar": 0,
      "fiber": 10.5,
      "fat": 18.2
    },
    {
      "name": "Curri",
      "calories": 435,
      "protein": 15,
      "carbs": 60,
      "sugar": 0,
      "fiber": 0,
      "fat": 15
    },
    {
      "name": "Eneldo",
      "calories": 340,
      "protein": 19.9,
      "carbs": 42.2,
      "sugar": 37.6,
      "fiber": 26.2,
      "fat": 4.4
    },
    {
      "name": "Gelatina en polvo",
      "calories": 338,
      "protein": 84.4,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Gelatina en tarrina",
      "calories": 62,
      "protein": 1.22,
      "carbs": 14.4,
      "sugar": 13.5,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Guindilla en polvo",
      "calories": 331,
      "protein": 12,
      "carbs": 31.7,
      "sugar": 25.1,
      "fiber": 0,
      "fat": 17.3
    },
    {
      "name": "Hinojo fresco",
      "calories": 20,
      "protein": 1.1,
      "carbs": 2.3,
      "sugar": 0.1,
      "fiber": 3.3,
      "fat": 0
    },
    {
      "name": "Jengibre fresco",
      "calories": 55,
      "protein": 1.7,
      "carbs": 9.5,
      "sugar": 3.1,
      "fiber": 2,
      "fat": 0.7
    },
    {
      "name": "Jengibre en polvo",
      "calories": 371,
      "protein": 9.1,
      "carbs": 64,
      "sugar": 3.39,
      "fiber": 12.5,
      "fat": 5.95
    },
    {
      "name": "Ketchup",
      "calories": 104,
      "protein": 2.1,
      "carbs": 24,
      "sugar": 22.9,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Laurel",
      "calories": 300,
      "protein": 7.6,
      "carbs": 48.6,
      "sugar": 48.6,
      "fiber": 0,
      "fat": 8.4
    },
    {
      "name": "Levadura de panadería fresca",
      "calories": 95,
      "protein": 13.2,
      "carbs": 6,
      "sugar": 0,
      "fiber": 7,
      "fat": 0.5
    },
    {
      "name": "Levadura de panadería seca",
      "calories": 209,
      "protein": 35.6,
      "carbs": 3.5,
      "sugar": 0,
      "fiber": 19.7,
      "fat": 1.5
    },
    {
      "name": "Levadura química en polvo",
      "calories": 72,
      "protein": 5.2,
      "carbs": 37.8,
      "sugar": 0,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Mayonesa comercial",
      "calories": 718,
      "protein": 1.8,
      "carbs": 0.1,
      "sugar": 0,
      "fiber": 0,
      "fat": 78.9
    },
    {
      "name": "Mayonesa comercial ligera",
      "calories": 354,
      "protein": 0.2,
      "carbs": 9.4,
      "sugar": 4.3,
      "fiber": 0,
      "fat": 35
    },
    {
      "name": "Mejorana seca",
      "calories": 437,
      "protein": 1.7,
      "carbs": 60.6,
      "sugar": 4.09,
      "fiber": 40.3,
      "fat": 7.04
    },
    {
      "name": "Menta, yerbabuena fresca",
      "calories": 43,
      "protein": 3.8,
      "carbs": 5.3,
      "sugar": 5.3,
      "fiber": 0,
      "fat": 0.7
    },
    {
      "name": "Mostaza",
      "calories": 84,
      "protein": 4.7,
      "carbs": 6.4,
      "sugar": 3.2,
      "fiber": 0,
      "fat": 4.4
    },
    {
      "name": "Nuez Moscada",
      "calories": 350,
      "protein": 5.8,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 36.3
    },
    {
      "name": "Orégano fresco",
      "calories": 66,
      "protein": 2.2,
      "carbs": 9.7,
      "sugar": 1.8,
      "fiber": 0,
      "fat": 2
    },
    {
      "name": "Orégano seco",
      "calories": 335,
      "protein": 11,
      "carbs": 49.5,
      "sugar": 9.4,
      "fiber": 0,
      "fat": 10.3
    },
    {
      "name": "Perejil fresco",
      "calories": 45,
      "protein": 3,
      "carbs": 2.7,
      "sugar": 2.5,
      "fiber": 5,
      "fat": 1.3
    },
    {
      "name": "Pimentón",
      "calories": 316,
      "protein": 14.8,
      "carbs": 34.9,
      "sugar": 34.9,
      "fiber": 10,
      "fat": 13
    },
    {
      "name": "Pimienta blanca",
      "calories": 61,
      "protein": 10.4,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 2.1
    },
    {
      "name": "Pimienta negra",
      "calories": 74,
      "protein": 11,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 3.3
    },
    {
      "name": "Romero seco",
      "calories": 391,
      "protein": 5,
      "carbs": 46.4,
      "sugar": 0,
      "fiber": 24.1,
      "fat": 15.2
    },
    {
      "name": "Sal fina de mesa",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Sal yodada de mesa",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Salsa agridulce",
      "calories": 121,
      "protein": 0.5,
      "carbs": 24,
      "sugar": 20.8,
      "fiber": 0.8,
      "fat": 2.4
    },
    {
      "name": "Salsa al curry",
      "calories": 78,
      "protein": 1.5,
      "carbs": 6.8,
      "sugar": 3.7,
      "fiber": 0,
      "fat": 5
    },
    {
      "name": "Salsa barbacoa",
      "calories": 71,
      "protein": 1.8,
      "carbs": 11.6,
      "sugar": 8.3,
      "fiber": 0.6,
      "fat": 1.8
    },
    {
      "name": "Salsa bechamel",
      "calories": 159,
      "protein": 3.9,
      "carbs": 10.8,
      "sugar": 4.4,
      "fiber": 0.3,
      "fat": 11
    },
    {
      "name": "Salsa carbonara",
      "calories": 307,
      "protein": 7.5,
      "carbs": 2,
      "sugar": 2,
      "fiber": 0,
      "fat": 29.9
    },
    {
      "name": "Salsa césar",
      "calories": 544,
      "protein": 2.2,
      "carbs": 3.3,
      "sugar": 2.8,
      "fiber": 0.5,
      "fat": 57.85
    },
    {
      "name": "Salsa de soja",
      "calories": 66,
      "protein": 8.7,
      "carbs": 6.7,
      "sugar": 2.9,
      "fiber": 1.6,
      "fat": 0.1
    },
    {
      "name": "Salsa de tabasco",
      "calories": 16,
      "protein": 1.3,
      "carbs": 0.8,
      "sugar": 0.67,
      "fiber": 0.6,
      "fat": 0.76
    },
    {
      "name": "Salsa holandesa",
      "calories": 289,
      "protein": 2.7,
      "carbs": 0.6,
      "sugar": 0.6,
      "fiber": 0,
      "fat": 30.6
    },
    {
      "name": "Salsa inglesa, perrins, Worcestershir o Worcester",
      "calories": 78,
      "protein": 0,
      "carbs": 19.5,
      "sugar": 10.03,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Salsa picante",
      "calories": 13,
      "protein": 0.5,
      "carbs": 1.8,
      "sugar": 1.26,
      "fiber": 0.3,
      "fat": 0.37
    },
    {
      "name": "Salsa rosa",
      "calories": 131,
      "protein": 1.4,
      "carbs": 28.2,
      "sugar": 11.83,
      "fiber": 1.8,
      "fat": 10.5
    },
    {
      "name": "Salsa tamari",
      "calories": 67,
      "protein": 10.5,
      "carbs": 5.6,
      "sugar": 1.7,
      "fiber": 0.8,
      "fat": 0.1
    },
    {
      "name": "Salsa tártara",
      "calories": 209,
      "protein": 1,
      "carbs": 13.3,
      "sugar": 4.25,
      "fiber": 0.5,
      "fat": 16.7
    },
    {
      "name": "Salsa verde",
      "calories": 42,
      "protein": 1.1,
      "carbs": 6.4,
      "sugar": 3.5,
      "fiber": 1.9,
      "fat": 0.89
    },
    {
      "name": "Salsa vinagreta",
      "calories": 648,
      "protein": 0.2,
      "carbs": 0.2,
      "sugar": 0.2,
      "fiber": 0,
      "fat": 71.8
    },
    {
      "name": "Tomate frito",
      "calories": 76,
      "protein": 1,
      "carbs": 3.3,
      "sugar": 1.4,
      "fiber": 3,
      "fat": 5.9
    },
    {
      "name": "Tomillo seco",
      "calories": 369,
      "protein": 9.1,
      "carbs": 57.1,
      "sugar": 0,
      "fiber": 18.6,
      "fat": 7.4
    },
    {
      "name": "Vainilla, estracto",
      "calories": 52,
      "protein": 0.1,
      "carbs": 12.7,
      "sugar": 12.7,
      "fiber": 0,
      "fat": 0.06
    },
    {
      "name": "Vinagre",
      "calories": 4,
      "protein": 0.4,
      "carbs": 0.6,
      "sugar": 0.6,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Vinagre balsámico",
      "calories": 70,
      "protein": 0.5,
      "carbs": 17.1,
      "sugar": 15,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Vinagre de sidra",
      "calories": 4,
      "protein": 0,
      "carbs": 0.9,
      "sugar": 0.9,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Almendarado",
      "calories": 431,
      "protein": 9,
      "carbs": 57,
      "sugar": 56,
      "fiber": 2,
      "fat": 18.1
    },
    {
      "name": "Arroz blanco",
      "calories": 381,
      "protein": 7,
      "carbs": 86,
      "sugar": 0.2,
      "fiber": 0.2,
      "fat": 0.9
    },
    {
      "name": "arroz blanco cocción rapida",
      "calories": 349,
      "protein": 6.9,
      "carbs": 78.2,
      "sugar": 0,
      "fiber": 1.4,
      "fat": 0.61
    },
    {
      "name": "arroz blanco hervido",
      "calories": 117,
      "protein": 2.3,
      "carbs": 26.3,
      "sugar": 0,
      "fiber": 0.5,
      "fat": 0.2
    },
    {
      "name": "Arroz inflado chocolateado",
      "calories": 381,
      "protein": 5.3,
      "carbs": 87.4,
      "sugar": 40.1,
      "fiber": 0.8,
      "fat": 1
    },
    {
      "name": "Arroz integral",
      "calories": 351,
      "protein": 8,
      "carbs": 73.4,
      "sugar": 1.4,
      "fiber": 2.8,
      "fat": 2.2
    },
    {
      "name": "Arroz integral hervido",
      "calories": 118,
      "protein": 2.5,
      "carbs": 24.6,
      "sugar": 0,
      "fiber": 1.4,
      "fat": 0.75
    },
    {
      "name": "Arroz salvaje",
      "calories": 369,
      "protein": 14.7,
      "carbs": 72.1,
      "sugar": 0,
      "fiber": 6.2,
      "fat": 1.08
    },
    {
      "name": "Arroz salvaje cocido",
      "calories": 105,
      "protein": 4,
      "carbs": 20.5,
      "sugar": 0,
      "fiber": 1.8,
      "fat": 0.34
    },
    {
      "name": "Avena",
      "calories": 361,
      "protein": 11.7,
      "carbs": 59.8,
      "sugar": 0,
      "fiber": 1.8,
      "fat": 7.1
    },
    {
      "name": "Barrita de cereales",
      "calories": 427,
      "protein": 7,
      "carbs": 70,
      "sugar": 41,
      "fiber": 1,
      "fat": 13
    },
    {
      "name": "Barrita de cereales integrales",
      "calories": 393,
      "protein": 8,
      "carbs": 76,
      "sugar": 35,
      "fiber": 1.5,
      "fat": 6
    },
    {
      "name": "Barrita de cereales ricos en fibra",
      "calories": 414,
      "protein": 7,
      "carbs": 51,
      "sugar": 23,
      "fiber": 19,
      "fat": 16
    },
    {
      "name": "Base de pizza",
      "calories": 273,
      "protein": 6.7,
      "carbs": 43.9,
      "sugar": 1.46,
      "fiber": 2.2,
      "fat": 7.4
    },
    {
      "name": "Biscotes",
      "calories": 387,
      "protein": 10,
      "carbs": 73.6,
      "sugar": 3,
      "fiber": 4,
      "fat": 5
    },
    {
      "name": "Bizcocho",
      "calories": 426,
      "protein": 4.8,
      "carbs": 53.7,
      "sugar": 31.9,
      "fiber": 13,
      "fat": 18.6
    },
    {
      "name": "Bizcocho de soletilla",
      "calories": 351,
      "protein": 7.6,
      "carbs": 71.8,
      "sugar": 50,
      "fiber": 0.2,
      "fat": 3.7
    },
    {
      "name": "Bolleria",
      "calories": 450,
      "protein": 7,
      "carbs": 52.8,
      "sugar": 1.2,
      "fiber": 2.1,
      "fat": 23
    },
    {
      "name": "Bollo con crema de cacao",
      "calories": 421,
      "protein": 3.7,
      "carbs": 59.6,
      "sugar": 6.8,
      "fiber": 7.2,
      "fat": 17
    },
    {
      "name": "Bulgur",
      "calories": 379,
      "protein": 12.3,
      "carbs": 70.2,
      "sugar": 0.41,
      "fiber": 183,
      "fat": 1.33
    },
    {
      "name": "Bulgur cocido",
      "calories": 92,
      "protein": 3.1,
      "carbs": 17.1,
      "sugar": 0.1,
      "fiber": 4.5,
      "fat": 0.24
    },
    {
      "name": "Canelones (Pasta)",
      "calories": 371,
      "protein": 11.9,
      "carbs": 74.8,
      "sugar": 2.7,
      "fiber": 3.1,
      "fat": 2
    },
    {
      "name": "Cebada en granos",
      "calories": 389,
      "protein": 12.5,
      "carbs": 70.8,
      "sugar": 0.8,
      "fiber": 17.3,
      "fat": 2.3
    },
    {
      "name": "Cebada perlada, cocida",
      "calories": 131,
      "protein": 2.3,
      "carbs": 27.5,
      "sugar": 0.28,
      "fiber": 3.8,
      "fat": 0.44
    },
    {
      "name": "Cebada perlada, cruda",
      "calories": 383,
      "protein": 9.9,
      "carbs": 75.5,
      "sugar": 0.8,
      "fiber": 15.6,
      "fat": 1.16
    },
    {
      "name": "Cereales (almohadillas ricas en fibra)",
      "calories": 393,
      "protein": 10,
      "carbs": 62,
      "sugar": 20,
      "fiber": 12,
      "fat": 9
    },
    {
      "name": "Cereales (arroz inflado chocolateado)",
      "calories": 384,
      "protein": 5,
      "carbs": 84,
      "sugar": 37,
      "fiber": 2.5,
      "fat": 2.5
    },
    {
      "name": "Cereales arroz inflado",
      "calories": 384,
      "protein": 7,
      "carbs": 85,
      "sugar": 9,
      "fiber": 1,
      "fat": 1.5
    },
    {
      "name": "Cereales copos de maíz tostados y azucarados",
      "calories": 375,
      "protein": 4.5,
      "carbs": 87,
      "sugar": 37,
      "fiber": 2,
      "fat": 0.6
    },
    {
      "name": "Cereales (Copos de maíz tostado)",
      "calories": 378,
      "protein": 7,
      "carbs": 84,
      "sugar": 8,
      "fiber": 13,
      "fat": 0.9
    },
    {
      "name": "Cereales (copos ricos en fibra)",
      "calories": 356,
      "protein": 10,
      "carbs": 67,
      "sugar": 22,
      "fiber": 15,
      "fat": 2
    },
    {
      "name": "Cereales (palitos ricos en fibra)",
      "calories": 334,
      "protein": 14,
      "carbs": 48,
      "sugar": 17,
      "fiber": 27,
      "fat": 3.5
    },
    {
      "name": "Cereales (Trigo inflado con miel)",
      "calories": 381,
      "protein": 6,
      "carbs": 84,
      "sugar": 45,
      "fiber": 3.5,
      "fat": 1.5
    },
    {
      "name": "Cereales con miel (bolitas)",
      "calories": 383,
      "protein": 5,
      "carbs": 88,
      "sugar": 33,
      "fiber": 6.406149904,
      "fat": 1
    },
    {
      "name": "Cereales de desayuno",
      "calories": 378,
      "protein": 7,
      "carbs": 84,
      "sugar": 8,
      "fiber": 19.21844971,
      "fat": 0.9
    },
    {
      "name": "Cereales integrales en copos",
      "calories": 379,
      "protein": 15,
      "carbs": 75,
      "sugar": 17,
      "fiber": 2.5,
      "fat": 1.5
    },
    {
      "name": "Churros",
      "calories": 361,
      "protein": 4.6,
      "carbs": 40,
      "sugar": 0.4,
      "fiber": 1.2,
      "fat": 20
    },
    {
      "name": "Copos de avena",
      "calories": 379,
      "protein": 13.2,
      "carbs": 61.9,
      "sugar": 0.99,
      "fiber": 10.1,
      "fat": 6.52
    },
    {
      "name": "Cruasán",
      "calories": 370,
      "protein": 8.3,
      "carbs": 38.3,
      "sugar": 5.2,
      "fiber": 2.5,
      "fat": 19.8
    },
    {
      "name": "Donuts",
      "calories": 426,
      "protein": 6.1,
      "carbs": 47.2,
      "sugar": 16.1,
      "fiber": 3.1,
      "fat": 23
    },
    {
      "name": "Ensaimada",
      "calories": 477,
      "protein": 7,
      "carbs": 52.8,
      "sugar": 9.9,
      "fiber": 2.1,
      "fat": 26
    },
    {
      "name": "Espaguetis",
      "calories": 369,
      "protein": 12,
      "carbs": 74.1,
      "sugar": 2.7,
      "fiber": 4,
      "fat": 1.8
    },
    {
      "name": "Fideos",
      "calories": 38,
      "protein": 12.9,
      "carbs": 78,
      "sugar": 2.9,
      "fiber": 4,
      "fat": 1.5
    },
    {
      "name": "Fideos de soba, japoneses",
      "calories": 336,
      "protein": 14.4,
      "carbs": 68,
      "sugar": 0,
      "fiber": 0,
      "fat": 0.71
    },
    {
      "name": "Galletas",
      "calories": 450,
      "protein": 7,
      "carbs": 71.5,
      "sugar": 29.8,
      "fiber": 5,
      "fat": 14
    },
    {
      "name": "Galletas cubiertas de chocolate",
      "calories": 525,
      "protein": 5.7,
      "carbs": 62.4,
      "sugar": 35.4,
      "fiber": 2.1,
      "fat": 27.6
    },
    {
      "name": "Galletas de mantequilla",
      "calories": 471,
      "protein": 6.1,
      "carbs": 68.9,
      "sugar": 25,
      "fiber": 0.8,
      "fat": 18.8
    },
    {
      "name": "Galletas cookies",
      "calories": 485,
      "protein": 7,
      "carbs": 64.5,
      "sugar": 26.8,
      "fiber": 5,
      "fat": 21
    },
    {
      "name": "Galletas digestive",
      "calories": 469,
      "protein": 6.3,
      "carbs": 63,
      "sugar": 13,
      "fiber": 4.6,
      "fat": 20.3
    },
    {
      "name": "Galletas tipo Maria",
      "calories": 414,
      "protein": 7,
      "carbs": 76,
      "sugar": 27.3,
      "fiber": 5,
      "fat": 8
    },
    {
      "name": "Galletas tipo sandwich",
      "calories": 510,
      "protein": 5,
      "carbs": 66.8,
      "sugar": 37.9,
      "fiber": 1.1,
      "fat": 24.5
    },
    {
      "name": "Gérmen de trigo",
      "calories": 347,
      "protein": 26.6,
      "carbs": 30.6,
      "sugar": 15.2,
      "fiber": 17.7,
      "fat": 9.2
    },
    {
      "name": "Gofio Canario, tostado",
      "calories": 357,
      "protein": 10.1,
      "carbs": 64.8,
      "sugar": 1.4,
      "fiber": 16.2,
      "fat": 2.74
    },
    {
      "name": "Harina de Centeno",
      "calories": 326,
      "protein": 10,
      "carbs": 59.7,
      "sugar": 0,
      "fiber": 15,
      "fat": 1.93
    },
    {
      "name": "Harina de Maíz",
      "calories": 369,
      "protein": 8.7,
      "carbs": 76,
      "sugar": 0,
      "fiber": 3,
      "fat": 2.7
    },
    {
      "name": "Harina de Trigo blanco",
      "calories": 375,
      "protein": 9.3,
      "carbs": 80,
      "sugar": 0.8,
      "fiber": 3.4,
      "fat": 1.2
    },
    {
      "name": "Harina de Trigo integral",
      "calories": 359,
      "protein": 11.5,
      "carbs": 68.8,
      "sugar": 2.5,
      "fiber": 9,
      "fat": 2.2
    },
    {
      "name": "Lasaña (pasta)",
      "calories": 371,
      "protein": 11.9,
      "carbs": 74.8,
      "sugar": 2.7,
      "fiber": 3.1,
      "fat": 2
    },
    {
      "name": "Macarrones",
      "calories": 369,
      "protein": 2,
      "carbs": 74.1,
      "sugar": 2.7,
      "fiber": 4,
      "fat": 1.8
    },
    {
      "name": "Magdalena",
      "calories": 388,
      "protein": 6.1,
      "carbs": 39.9,
      "sugar": 19.2,
      "fiber": 1,
      "fat": 22.4
    },
    {
      "name": "Maíz desgrasado en conserva",
      "calories": 73,
      "protein": 2.9,
      "carbs": 10.7,
      "sugar": 4.1,
      "fiber": 3.9,
      "fat": 1.2
    },
    {
      "name": "Maíz en mazorca, cocida, congelada",
      "calories": 100,
      "protein": 3.1,
      "carbs": 18.7,
      "sugar": 3.59,
      "fiber": 2.8,
      "fat": 0.74
    },
    {
      "name": "Maíz en mazorca, cruda, congelada",
      "calories": 104,
      "protein": 3.3,
      "carbs": 19.5,
      "sugar": 3.78,
      "fiber": 2.8,
      "fat": 0.78
    },
    {
      "name": "Maíz, copos",
      "calories": 372,
      "protein": 7,
      "carbs": 83,
      "sugar": 6.9,
      "fiber": 2.5,
      "fat": 0.8
    },
    {
      "name": "Maíz, copos tostados y azucarados",
      "calories": 372,
      "protein": 5.3,
      "carbs": 86.6,
      "sugar": 39.8,
      "fiber": 0.5,
      "fat": 0.4
    },
    {
      "name": "Medias noches",
      "calories": 283,
      "protein": 6.5,
      "carbs": 52.3,
      "sugar": 2.6,
      "fiber": 2.9,
      "fat": 4.7
    },
    {
      "name": "Mijo",
      "calories": 357,
      "protein": 11,
      "carbs": 64.4,
      "sugar": 8.2,
      "fiber": 8.5,
      "fat": 4.7
    },
    {
      "name": "Milhojas con nata y crema",
      "calories": 285,
      "protein": 4.5,
      "carbs": 33,
      "sugar": 10.8,
      "fiber": 1,
      "fat": 14.8
    },
    {
      "name": "Muesli",
      "calories": 399,
      "protein": 10.5,
      "carbs": 67.1,
      "sugar": 20.9,
      "fiber": 7.7,
      "fat": 8.1
    },
    {
      "name": "Noodles de arroz ",
      "calories": 357,
      "protein": 3.4,
      "carbs": 83.8,
      "sugar": 0.4,
      "fiber": 1.6,
      "fat": 0.6
    },
    {
      "name": "Palmeras",
      "calories": 513,
      "protein": 7,
      "carbs": 52.8,
      "sugar": 18.6,
      "fiber": 2.1,
      "fat": 30
    },
    {
      "name": "Pan blanco de molde",
      "calories": 287,
      "protein": 8,
      "carbs": 52,
      "sugar": 2.1,
      "fiber": 3.2,
      "fat": 4.5
    },
    {
      "name": "Pan blanco de trigo",
      "calories": 277,
      "protein": 7.8,
      "carbs": 58,
      "sugar": 2,
      "fiber": 2.2,
      "fat": 1
    },
    {
      "name": "Pan blanco de trigo sin sal",
      "calories": 277,
      "protein": 7.8,
      "carbs": 58,
      "sugar": 2,
      "fiber": 2.2,
      "fat": 1
    },
    {
      "name": "Pan blanco tostado",
      "calories": 309,
      "protein": 10.1,
      "carbs": 59.2,
      "sugar": 4.1,
      "fiber": 4.5,
      "fat": 2.5
    },
    {
      "name": "Pan blanco tostado sin sal",
      "calories": 309,
      "protein": 10.1,
      "carbs": 59.2,
      "sugar": 4.1,
      "fiber": 4.5,
      "fat": 2.5
    },
    {
      "name": "Pan de centeno",
      "calories": 230,
      "protein": 6.2,
      "carbs": 45.8,
      "sugar": 5.4,
      "fiber": 6.5,
      "fat": 1
    },
    {
      "name": "Pan de pasas",
      "calories": 328,
      "protein": 8.1,
      "carbs": 45,
      "sugar": 3,
      "fiber": 4,
      "fat": 12
    },
    {
      "name": "Pan de trigo y centeno",
      "calories": 243,
      "protein": 6.7,
      "carbs": 49,
      "sugar": 3,
      "fiber": 5.5,
      "fat": 1
    },
    {
      "name": "Pan integral de molde",
      "calories": 251,
      "protein": 9,
      "carbs": 44,
      "sugar": 1.8,
      "fiber": 6,
      "fat": 3
    },
    {
      "name": "Pan integral de trigo",
      "calories": 258,
      "protein": 8,
      "carbs": 49,
      "sugar": 2.3,
      "fiber": 8.5,
      "fat": 1.4
    },
    {
      "name": "Pan integral tostado",
      "calories": 282,
      "protein": 10.8,
      "carbs": 48.7,
      "sugar": 2.3,
      "fiber": 8.7,
      "fat": 2.9
    },
    {
      "name": "Pan multicereales",
      "calories": 280,
      "protein": 13.4,
      "carbs": 43.3,
      "sugar": 6.39,
      "fiber": 7.4,
      "fat": 4.23
    },
    {
      "name": "Pan rallado",
      "calories": 277,
      "protein": 7.8,
      "carbs": 58,
      "sugar": 2,
      "fiber": 2.2,
      "fat": 1
    },
    {
      "name": "Panecillo hechos con aceite de oliva",
      "calories": 293,
      "protein": 8,
      "carbs": 53.6,
      "sugar": 2.1,
      "fiber": 3.2,
      "fat": 4.5
    },
    {
      "name": "Pasta",
      "calories": 375,
      "protein": 12,
      "carbs": 75.8,
      "sugar": 2.8,
      "fiber": 4,
      "fat": 1.8
    },
    {
      "name": "Pasta al huevo",
      "calories": 383,
      "protein": 12.1,
      "carbs": 71.7,
      "sugar": 1.9,
      "fiber": 5,
      "fat": 4.2
    },
    {
      "name": "Pasta al huevo hervida",
      "calories": 126,
      "protein": 4.7,
      "carbs": 22.9,
      "sugar": 0.6,
      "fiber": 1,
      "fat": 1.49
    },
    {
      "name": "Pasta hervida",
      "calories": 120,
      "protein": 4,
      "carbs": 22.2,
      "sugar": 0.5,
      "fiber": 2,
      "fat": 1.2
    },
    {
      "name": "Pasta integral",
      "calories": 353,
      "protein": 13.1,
      "carbs": 63.7,
      "sugar": 2.3,
      "fiber": 9.6,
      "fat": 2.9
    },
    {
      "name": "Pasta rellena con carne hervida",
      "calories": 104,
      "protein": 4.7,
      "carbs": 12.7,
      "sugar": 0,
      "fiber": 1.8,
      "fat": 3.37
    },
    {
      "name": "Pasta rellena con queso hervida",
      "calories": 151,
      "protein": 9.5,
      "carbs": 16.3,
      "sugar": 0.96,
      "fiber": 0.9,
      "fat": 5.1
    },
    {
      "name": "Pastas de té",
      "calories": 344,
      "protein": 8.9,
      "carbs": 58.3,
      "sugar": 11.1,
      "fiber": 0,
      "fat": 8.3
    },
    {
      "name": "Pasteles y otros dulces",
      "calories": 402,
      "protein": 5.2,
      "carbs": 49.2,
      "sugar": 31.5,
      "fiber": 1.2,
      "fat": 20.2
    },
    {
      "name": "Picatostes",
      "calories": 308,
      "protein": 10.1,
      "carbs": 57.9,
      "sugar": 4,
      "fiber": 4.5,
      "fat": 2.99
    },
    {
      "name": "Porras",
      "calories": 322,
      "protein": 2.3,
      "carbs": 36.1,
      "sugar": 0.4,
      "fiber": 1.2,
      "fat": 18.5
    },
    {
      "name": "Quinoa",
      "calories": 318,
      "protein": 13.8,
      "carbs": 49.2,
      "sugar": 5.9,
      "fiber": 7.9,
      "fat": 5.6
    },
    {
      "name": "Salvado de avena",
      "calories": 246,
      "protein": 17.3,
      "carbs": 20.7,
      "sugar": 1.45,
      "fiber": 15.4,
      "fat": 7.03
    },
    {
      "name": "Salvado de trigo",
      "calories": 292,
      "protein": 14.1,
      "carbs": 26.8,
      "sugar": 0.1,
      "fiber": 39.6,
      "fat": 5.5
    },
    {
      "name": "Sémola de trigo",
      "calories": 363,
      "protein": 12.5,
      "carbs": 73.6,
      "sugar": 0.3,
      "fiber": 4,
      "fat": 1.2
    },
    {
      "name": "Sobaos",
      "calories": 432,
      "protein": 8.8,
      "carbs": 56.3,
      "sugar": 3.2,
      "fiber": 0,
      "fat": 19.1
    },
    {
      "name": "Suizo",
      "calories": 404,
      "protein": 9.9,
      "carbs": 40.5,
      "sugar": 5,
      "fiber": 2.6,
      "fat": 21.9
    },
    {
      "name": "Tartas",
      "calories": 402,
      "protein": 5.2,
      "carbs": 49.2,
      "sugar": 31.5,
      "fiber": 1.2,
      "fat": 20.2
    },
    {
      "name": "Tortas de aceite (tipo Inés Rosales)",
      "calories": 496,
      "protein": 6.5,
      "carbs": 67.8,
      "sugar": 16.7,
      "fiber": 0.7,
      "fat": 22
    },
    {
      "name": "Tortas de maíz",
      "calories": 231,
      "protein": 5.7,
      "carbs": 42.4,
      "sugar": 0.88,
      "fiber": 6.3,
      "fat": 2.85
    },
    {
      "name": "Tortitas de harina trigo para burritos listas para hornear o freír",
      "calories": 332,
      "protein": 8.7,
      "carbs": 56.6,
      "sugar": 0,
      "fiber": 3.3,
      "fat": 7.1
    },
    {
      "name": "Trigo, Gluten para preparara seitán ",
      "calories": 371,
      "protein": 75.2,
      "carbs": 13.2,
      "sugar": 0,
      "fiber": 0.6,
      "fat": 1.85
    },
    {
      "name": "Arroz con leche",
      "calories": 110,
      "protein": 3,
      "carbs": 20.2,
      "sugar": 16.3,
      "fiber": 0.02,
      "fat": 1.9
    },
    {
      "name": "Batido de cacao",
      "calories": 98,
      "protein": 3.8,
      "carbs": 10.9,
      "sugar": 10.9,
      "fiber": 0.2,
      "fat": 4.3
    },
    {
      "name": "Batido de fresa",
      "calories": 65,
      "protein": 2.8,
      "carbs": 11.2,
      "sugar": 11.2,
      "fiber": 0,
      "fat": 1
    },
    {
      "name": "Batido de vainilla",
      "calories": 62,
      "protein": 2.9,
      "carbs": 10.3,
      "sugar": 10.3,
      "fiber": 0,
      "fat": 1
    },
    {
      "name": "Batidos lácteos",
      "calories": 100,
      "protein": 3.8,
      "carbs": 10.9,
      "sugar": 10.9,
      "fiber": 0,
      "fat": 4.6
    },
    {
      "name": "Crema catalana",
      "calories": 178,
      "protein": 3.6,
      "carbs": 20.5,
      "sugar": 14.3,
      "fiber": 0,
      "fat": 9.1
    },
    {
      "name": "Cuajada",
      "calories": 94,
      "protein": 4.8,
      "carbs": 6.7,
      "sugar": 6.7,
      "fiber": 0,
      "fat": 5.3
    },
    {
      "name": "Flan de huevo",
      "calories": 127,
      "protein": 4.9,
      "carbs": 21.6,
      "sugar": 21.6,
      "fiber": 0,
      "fat": 2.3
    },
    {
      "name": "Flan de vainilla",
      "calories": 105,
      "protein": 3,
      "carbs": 19.1,
      "sugar": 15.5,
      "fiber": 0,
      "fat": 1.8
    },
    {
      "name": "Flan instantáneo en polvo para reconstituir",
      "calories": 366,
      "protein": 0,
      "carbs": 91.6,
      "sugar": 0,
      "fiber": 0,
      "fat": 0
    },
    {
      "name": "Helado cremoso",
      "calories": 199,
      "protein": 2.8,
      "carbs": 26.2,
      "sugar": 26.2,
      "fiber": 0,
      "fat": 9.2
    },
    {
      "name": "Helados",
      "calories": 211,
      "protein": 4.5,
      "carbs": 25.4,
      "sugar": 25.4,
      "fiber": 0,
      "fat": 10.1
    },
    {
      "name": "Kéfir",
      "calories": 64,
      "protein": 3.3,
      "carbs": 4.8,
      "sugar": 4.8,
      "fiber": 0,
      "fat": 3.5
    },
    {
      "name": "Leche concentrada",
      "calories": 152,
      "protein": 8.2,
      "carbs": 10,
      "sugar": 10,
      "fiber": 0,
      "fat": 8.8
    },
    {
      "name": "Leche condensada entera",
      "calories": 343,
      "protein": 8.8,
      "carbs": 56,
      "sugar": 56,
      "fiber": 0,
      "fat": 9.3
    },
    {
      "name": "Leche condensada desnatada",
      "calories": 287,
      "protein": 10,
      "carbs": 60,
      "sugar": 60,
      "fiber": 0,
      "fat": 0.2
    },
    {
      "name": "Leche de cabra",
      "calories": 67,
      "protein": 3.4,
      "carbs": 4.5,
      "sugar": 4.5,
      "fiber": 0,
      "fat": 3.9
    },
    {
      "name": "Leche de oveja",
      "calories": 100,
      "protein": 5.6,
      "carbs": 5,
      "sugar": 5,
      "fiber": 0,
      "fat": 6.35
    },
    {
      "name": "Leche de vaca desnatada",
      "calories": 35,
      "protein": 3.4,
      "carbs": 5,
      "sugar": 5,
      "fiber": 0,
      "fat": 0.1
    },
    {
      "name": "Leche de vaca entera",
      "calories": 66,
      "protein": 3.3,
      "carbs": 5,
      "sugar": 5,
      "fiber": 0,
      "fat": 3.6
    },
    {
      "name": "Leche de vaca semidesnatada",
      "calories": 43,
      "protein": 3,
      "carbs": 4.4,
      "sugar": 4.4,
      "fiber": 0,
      "fat": 1.5
    },
    {
      "name": "Leche desnatada en polvo sin diluir",
      "calories": 371,
      "protein": 37.6,
      "carbs": 53,
      "sugar": 53,
      "fiber": 0,
      "fat": 1
    },
    {
      "name": "Leche entera en polvo sin diluir",
      "calories": 490,
      "protein": 26,
      "carbs": 38,
      "sugar": 38,
      "fiber": 0,
      "fat": 26
    },
    {
      "name": "Leche evaporada entera",
      "calories": 135,
      "protein": 6.8,
      "carbs": 10,
      "sugar": 10,
      "fiber": 0,
      "fat": 7.56
    },
    {
      "name": "Leche fermentada con lactobacillus acidophilus",
      "calories": 99,
      "protein": 3.1,
      "carbs": 14.1,
      "sugar": 14.1,
      "fiber": 0,
      "fat": 3.3
    },
    {
      "name": "Leche fermentada con lactobacillus casei",
      "calories": 98,
      "protein": 3,
      "carbs": 14.1,
      "sugar": 14.1,
      "fiber": 0,
      "fat": 3.3
    },
    {
      "name": "Leche fermentada tipo bio con frutas",
      "calories": 87,
      "protein": 4,
      "carbs": 14,
      "sugar": 14,
      "fiber": 0,
      "fat": 1.7
    },
    {
      "name": "Leche fermentada tipo bio desnatada con frutas",
      "calories": 45,
      "protein": 4.7,
      "carbs": 6.4,
      "sugar": 6.4,
      "fiber": 0,
      "fat": 0.021
    },
    {
      "name": "Leche fermentada tipo bio desnatada natural",
      "calories": 44,
      "protein": 4.9,
      "carbs": 5.5,
      "sugar": 5.5,
      "fiber": 0,
      "fat": 0.3
    },
    {
      "name": "AlimentoLeche fermentada tipo bio natural",
      "calories": 63,
      "protein": 3.6,
      "carbs": 4.4,
      "sugar": 4.4,
      "fiber": 0,
      "fat": 3.4
    },
    {
      "name": "Mousse de chocolate",
      "calories": 190,
      "protein": 5.1,
      "carbs": 22.7,
      "sugar": 20.1,
      "fiber": 0,
      "fat": 8.8
    },
    {
      "name": "Nata",
      "calories": 448,
      "protein": 1.5,
      "carbs": 2,
      "sugar": 2,
      "fiber": 0,
      "fat": 48.2
    },
    {
      "name": "Nata líquida para cocinar(18%grasa)",
      "calories": 204,
      "protein": 2.5,
      "carbs": 3.4,
      "sugar": 3.4,
      "fiber": 0,
      "fat": 19.99
    },
    {
      "name": "Nata líquida para cocinar(35%grasa)",
      "calories": 330,
      "protein": 2.2,
      "carbs": 3.9,
      "sugar": 3.9,
      "fiber": 0,
      "fat": 33.99
    },
    {
      "name": "Nata montada",
      "calories": 331,
      "protein": 2.1,
      "carbs": 10.1,
      "sugar": 10.1,
      "fiber": 0,
      "fat": 31.4
    },
    {
      "name": "Natillas",
      "calories": 120,
      "protein": 3.8,
      "carbs": 16.8,
      "sugar": 11.7,
      "fiber": 0,
      "fat": 4.2
    },
    {
      "name": "Natillas de chocolate",
      "calories": 135,
      "protein": 3.6,
      "carbs": 20.6,
      "sugar": 14.4,
      "fiber": 0,
      "fat": 4.2
    },
    {
      "name": "Petit suisse natural azucarado",
      "calories": 120,
      "protein": 7.3,
      "carbs": 13.7,
      "sugar": 13.7,
      "fiber": 0,
      "fat": 4
    },
    {
      "name": "Queso azul",
      "calories": 353,
      "protein": 21.1,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 29.8
    },
    {
      "name": "Queso brie",
      "calories": 320,
      "protein": 19.3,
      "carbs": 0.1,
      "sugar": 0.1,
      "fiber": 0,
      "fat": 26.9
    },
    {
      "name": "Queso camembert",
      "calories": 285,
      "protein": 21,
      "carbs": 0.1,
      "sugar": 0.1,
      "fiber": 0,
      "fat": 22.3
    },
    {
      "name": "Queso cheddar",
      "calories": 393,
      "protein": 25.4,
      "carbs": 0.36,
      "sugar": 0.36,
      "fiber": 0,
      "fat": 32.2
    },
    {
      "name": "Queso de  bola",
      "calories": 349,
      "protein": 29,
      "carbs": 2,
      "sugar": 2,
      "fiber": 0,
      "fat": 25
    },
    {
      "name": "Queso de Burgos",
      "calories": 175,
      "protein": 15,
      "carbs": 4,
      "sugar": 4,
      "fiber": 0,
      "fat": 11
    },
    {
      "name": "Queso de cabra curado",
      "calories": 467,
      "protein": 27.6,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 39.6
    },
    {
      "name": "Queso de cabra tierno",
      "calories": 199,
      "protein": 13.1,
      "carbs": 1,
      "sugar": 1,
      "fiber": 0,
      "fat": 15.8
    },
    {
      "name": "Queso de Cabrales",
      "calories": 389,
      "protein": 21,
      "carbs": 2,
      "sugar": 2,
      "fiber": 0,
      "fat": 33
    },
    {
      "name": "Queso de tetilla",
      "calories": 398,
      "protein": 22,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 34.5
    },
    {
      "name": "Queso edam",
      "calories": 356,
      "protein": 25,
      "carbs": 1.4,
      "sugar": 1.4,
      "fiber": 0,
      "fat": 27.8
    },
    {
      "name": "Queso emmental",
      "calories": 380,
      "protein": 28,
      "carbs": 0.2,
      "sugar": 0.2,
      "fiber": 0,
      "fat": 29.7
    },
    {
      "name": "Queso en lonchas",
      "calories": 383,
      "protein": 29,
      "carbs": 2,
      "sugar": 2,
      "fiber": 0,
      "fat": 28.8
    },
    {
      "name": "Queso en porciones",
      "calories": 312,
      "protein": 18,
      "carbs": 2.5,
      "sugar": 2.5,
      "fiber": 0,
      "fat": 25.5
    },
    {
      "name": "Queso en porciones descremado",
      "calories": 136,
      "protein": 16,
      "carbs": 5.5,
      "sugar": 5.5,
      "fiber": 0,
      "fat": 5.5
    },
    {
      "name": "Queso feta",
      "calories": 255,
      "protein": 14.2,
      "carbs": 4.1,
      "sugar": 4.1,
      "fiber": 0,
      "fat": 21.3
    },
    {
      "name": "Queso gallego",
      "calories": 357,
      "protein": 23,
      "carbs": 2,
      "sugar": 2,
      "fiber": 0,
      "fat": 28.5
    },
    {
      "name": "Queso gorgonzola",
      "calories": 361,
      "protein": 19.4,
      "carbs": 0.62,
      "sugar": 0.62,
      "fiber": 0,
      "fat": 31.2
    },
    {
      "name": "Queso gouda",
      "calories": 331,
      "protein": 25.5,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 25.4
    },
    {
      "name": "Queso gruyer",
      "calories": 401,
      "protein": 29,
      "carbs": 1.5,
      "sugar": 1.5,
      "fiber": 0,
      "fat": 31
    },
    {
      "name": "Queso Idiazabal",
      "calories": 443,
      "protein": 23.3,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 38.9
    },
    {
      "name": "Queso Mahón",
      "calories": 411,
      "protein": 26.9,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 33.7
    },
    {
      "name": "Queso manchego curado",
      "calories": 420,
      "protein": 32,
      "carbs": 1,
      "sugar": 1,
      "fiber": 0,
      "fat": 32
    },
    {
      "name": "Queso manchego en aceite",
      "calories": 470,
      "protein": 26.5,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 40.5
    },
    {
      "name": "Queso manchego fresco",
      "calories": 333,
      "protein": 26,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 25.4
    },
    {
      "name": "Queso manchego semicurado",
      "calories": 376,
      "protein": 29,
      "carbs": 0.5,
      "sugar": 0.5,
      "fiber": 0,
      "fat": 28.7
    },
    {
      "name": "Queso mozzarella",
      "calories": 223,
      "protein": 19.5,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 16.1
    },
    {
      "name": "Queso para untar",
      "calories": 277,
      "protein": 13.5,
      "carbs": 4.4,
      "sugar": 4.4,
      "fiber": 0,
      "fat": 22.8
    },
    {
      "name": "Queso para untar light",
      "calories": 187,
      "protein": 7.8,
      "carbs": 3.4,
      "sugar": 3.4,
      "fiber": 0,
      "fat": 16
    },
    {
      "name": "Queso parmesano",
      "calories": 420,
      "protein": 40,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 28.9
    },
    {
      "name": "Queso quark 20%Mg en materia seca",
      "calories": 71,
      "protein": 7.8,
      "carbs": 3.5,
      "sugar": 3.5,
      "fiber": 0,
      "fat": 2.9
    },
    {
      "name": "Queso quark descremado",
      "calories": 68,
      "protein": 13.2,
      "carbs": 3.2,
      "sugar": 3.2,
      "fiber": 0,
      "fat": 0.25
    },
    {
      "name": "Queso raclette",
      "calories": 369,
      "protein": 25,
      "carbs": 0.69,
      "sugar": 0,
      "fiber": 0,
      "fat": 29.6
    },
    {
      "name": "Queso rallado",
      "calories": 422,
      "protein": 40,
      "carbs": 0.5,
      "sugar": 0.5,
      "fiber": 0,
      "fat": 28.9
    },
    {
      "name": "Queso ricotta",
      "calories": 161,
      "protein": 11.5,
      "carbs": 3.75,
      "sugar": 3.75,
      "fiber": 0,
      "fat": 10.5
    },
    {
      "name": "Queso roquefort",
      "calories": 380,
      "protein": 23,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 32
    },
    {
      "name": "Queso San Simón",
      "calories": 385,
      "protein": 24.9,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 31.7
    },
    {
      "name": "Queso Torta del Casar",
      "calories": 399,
      "protein": 26.3,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 32.6
    },
    {
      "name": "Queso zamorano",
      "calories": 438,
      "protein": 25.3,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "fat": 37.45
    },
    {
      "name": "Requesón",
      "calories": 98,
      "protein": 13.6,
      "carbs": 1.8,
      "sugar": 1.8,
      "fiber": 0,
      "fat": 4
    },
    {
      "name": "yogur desnatado con cereales",
      "calories": 59.2,
      "protein": 4.6,
      "carbs": 6.9,
      "sugar": 5.65,
      "fiber": 0.3,
      "fat": 1.1
    },
    {
      "name": "Yogur denatado natural",
      "calories": 45,
      "protein": 4.3,
      "carbs": 6.3,
      "sugar": 6.3,
      "fiber": 0,
      "fat": 0.32
    },
    {
      "name": "Yogur desnatado natural con azúcar",
      "calories": 76,
      "protein": 4.5,
      "carbs": 13.8,
      "sugar": 13.8,
      "fiber": 0,
      "fat": 0.3
    },
    {
      "name": "Yogur entero con cereales",
      "calories": 92.7,
      "protein": 3.9,
      "carbs": 9.1,
      "sugar": 8.28,
      "fiber": 1.84,
      "fat": 3.78
    },
    {
      "name": "Yogur entero con fruta",
      "calories": 95,
      "protein": 3.8,
      "carbs": 14.3,
      "sugar": 14.3,
      "fiber": 0.9,
      "fat": 2.3
    },
    {
      "name": "Yogur entero de sabores",
      "calories": 115,
      "protein": 5.4,
      "carbs": 15.6,
      "sugar": 15.6,
      "fiber": 0,
      "fat": 3.4
    },
    {
      "name": "Yogur entero natural",
      "calories": 57,
      "protein": 3.7,
      "carbs": 4.4,
      "sugar": 4.4,
      "fiber": 0,
      "fat": 2.7
    },
      { "name": "Yogur entero natural azucarado", "calories": 86, "protein": 3.3, "carbs": 13.7, "sugar": 13.7, "fiber": 0, "fat": 2 },
      { "name": "Yogur griego", "calories": 139, "protein": 6.4, "carbs": 5.4, "sugar": 5.4, "fiber": 0, "fat": 10.2 },
      { "name": "Yogur líquido con pulpa de fruta", "calories": 82, "protein": 2.8, "carbs": 14.3, "sugar": 14.3, "fiber": 0, "fat": 1.5 },
      { "name": "Yogur líquido de sabores", "calories": 75, "protein": 2.9, "carbs": 12.8, "sugar": 12.8, "fiber": 0, "fat": 1.4 },
      { "name": "Yogur líquido natural azucarado", "calories": 69, "protein": 3, "carbs": 11.6, "sugar": 11.6, "fiber": 0, "fat": 1.2 },
      { "name": "Clara de huevo", "calories": 49, "protein": 11, "carbs": 0.7, "sugar": 0.7, "fiber": 0, "fat": 0.2 },
      { "name": "Huevo de codorniz", "calories": 155, "protein": 13.1, "carbs": 0.41, "sugar": 0.41, "fiber": 0, "fat": 11.2 },
      { "name": "Huevo de gallina", "calories": 150, "protein": 12.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 11.1 },
      { "name": "Huevo de pato", "calories": 184, "protein": 13, "carbs": 0.7, "sugar": 0.7, "fiber": 0, "fat": 14.4 },
      { "name": "Yema de huevo", "calories": 363, "protein": 16, "carbs": 0.6, "sugar": 0.6, "fiber": 0, "fat": 33 },
      { "name": "Azucar blanco", "calories": 398, "protein": 0, "carbs": 99.5, "sugar": 99.5, "fiber": 0, "fat": 0 },
      { "name": "Azucar moreno", "calories": 386, "protein": 0.1, "carbs": 96.4, "sugar": 96.4, "fiber": 0, "fat": 0 },
      { "name": "Bombones", "calories": 474, "protein": 4.8, "carbs": 66, "sugar": 65.3, "fiber": 0, "fat": 21.2 },
      { "name": "Cacao en polvo azucarado (2,5% grasa)", "calories": 330, "protein": 9.8, "carbs": 67.1, "sugar": 61.6, "fiber": 0, "fat": 2.5 },
      { "name": "Cacao en polvo azucarado (8% grasa)", "calories": 381, "protein": 9.8, "carbs": 67.1, "sugar": 61.5, "fiber": 0, "fat": 8.1 },
      { "name": "Caramelos", "calories": 380, "protein": 0.8, "carbs": 94, "sugar": 94, "fiber": 0, "fat": 0.1 },
      { "name": "Chicle con azucar", "calories": 381, "protein": 0, "carbs": 95.2, "sugar": 95.2, "fiber": 0, "fat": 0 },
      { "name": "Chicle sin azucar", "calories": 270, "protein": 0.2, "carbs": 66.6, "sugar": 66.6, "fiber": 0, "fat": 0.3 },
      { "name": "Chocolate (a)", "calories": 532, "protein": 7.8, "carbs": 56.4, "sugar": 51.8, "fiber": 0, "fat": 30.6 },
      { "name": "Chocolcate blanco", "calories": 543, "protein": 8, "carbs": 58.3, "sugar": 58.3, "fiber": 0, "fat": 30.9 },
      { "name": "Chocolate con leche", "calories": 553, "protein": 8.4, "carbs": 60, "sugar": 60, "fiber": 0, "fat": 31 },
      { "name": "Chocolate con leche y almendras", "calories": 561, "protein": 8.7, "carbs": 51.5, "sugar": 51.5, "fiber": 3, "fat": 34.9 },
      { "name": "Chocolate en polvo", "calories": 324, "protein": 9.8, "carbs": 67.1, "sugar": 64, "fiber": 0, "fat": 1.8 },
      { "name": "Chocolate negro", "calories": 543, "protein": 6.3, "carbs": 43.6, "sugar": 41.9, "fiber": 12.1, "fat": 35.5 },
      { "name": "Chocolate negro (45%-59% cacao)", "calories": 560, "protein": 4.9, "carbs": 61.2, "sugar": 47.9, "fiber": 7, "fat": 31.3 },
      { "name": "Chocolate negro (60%-69% cacao)", "calories": 595, "protein": 6.1, "carbs": 52.4, "sugar": 36.7, "fiber": 8, "fat": 38.3 },
      { "name": "Chocolate negro (70%-85% cacao)", "calories": 620, "protein": 7.8, "carbs": 45.9, "sugar": 24, "fiber": 10.9, "fat": 42.6 },
      { "name": "Compota de manzana", "calories": 81, "protein": 0.2, "carbs": 19.1, "sugar": 19.1, "fiber": 1.6, "fat": 0.1 },
      { "name": "Confitura baja en calorias", "calories": 39, "protein": 0.6, "carbs": 9.3, "sugar": 9.3, "fiber": 0, "fat": 0 },
      { "name": "Crema de cacao y avellanas", "calories": 550, "protein": 5.5, "carbs": 58.3, "sugar": 58.3, "fiber": 1, "fat": 32.5 },
      { "name": "Crema pastelera", "calories": 158, "protein": 4.9, "carbs": 22.3, "sugar": 17.5, "fiber": 0.3, "fat": 5.37 },
      { "name": "Dulce de membrillo", "calories": 235, "protein": 0.2, "carbs": 57, "sugar": 57, "fiber": 3.2, "fat": 0 },
      { "name": "Edulcorante aspartamo (E-951)", "calories": 52, "protein": 13, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0 },
      { "name": "Edulcorante liquido", "calories": 4, "protein": 0, "carbs": 1, "sugar": 1, "fiber": 0, "fat": 0 },
      { "name": "Fructosa", "calories": 399, "protein": 0, "carbs": 99.8, "sugar": 99.8, "fiber": 0, "fat": 0 },
      { "name": "Granadina, jarabe", "calories": 268, "protein": 0, "carbs": 66.9, "sugar": 46.55, "fiber": 0, "fat": 0 },
      { "name": "Jaleas", "calories": 261, "protein": 0.2, "carbs": 65, "sugar": 65, "fiber": 0, "fat": 0 },
      { "name": "Jarabe", "calories": 297, "protein": 0.1, "carbs": 74.1, "sugar": 74.1, "fiber": 0, "fat": 0 },
      { "name": "Mazapan", "calories": 472, "protein": 9, "carbs": 52, "sugar": 43.4, "fiber": 6, "fat": 24 },
      { "name": "Mermelada", "calories": 282, "protein": 0.2, "carbs": 70, "sugar": 70, "fiber": 0.7, "fat": 0 },
      { "name": "Mermelada baja en calorias", "calories": 154, "protein": 0.4, "carbs": 38, "sugar": 38, "fiber": 0, "fat": 0 },
      { "name": "Miel", "calories": 314, "protein": 0.5, "carbs": 78, "sugar": 78, "fiber": 0, "fat": 0 },
      { "name": "Polo (helado de hielo)", "calories": 134, "protein": 1, "carbs": 29.5, "sugar": 29.5, "fiber": 0, "fat": 1.3 },
      { "name": "Regaliz", "calories": 325, "protein": 3.9, "carbs": 71.5, "sugar": 65.2, "fiber": 2, "fat": 2.2 },
      { "name": "Sacarina", "calories": 0, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0 },
      { "name": "Trufa de chocolate", "calories": 513, "protein": 6.2, "carbs": 44.9, "sugar": 38.31, "fiber": 2.5, "fat": 33.76 },
      { "name": "Turron", "calories": 499, "protein": 10, "carbs": 57.4, "sugar": 56.3, "fiber": 7.1, "fat": 23.9 },
      { "name": "Turron de Alicante duro", "calories": 496, "protein": 13, "carbs": 44.9, "sugar": 44.1, "fiber": 5.9, "fat": 28.1 },
      { "name": "Turron de Jijona (blando)", "calories": 504, "protein": 13, "carbs": 43.5, "sugar": 42.6, "fiber": 7.8, "fat": 29.2 },
        { "name": "Aceite de cacahuete", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de coco", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de colza", "calories": 900, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 100 },
        { "name": "Aceite de girasol", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de maíz", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de nuez", "calories": 898, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.79 },
        { "name": "Aceite de oliva", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de oliva virgen", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de palma", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de semilla de uva", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Aceite de sésamo", "calories": 900, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 100 },
        { "name": "Aceite de soja", "calories": 899, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.9 },
        { "name": "Manteca de cerdo", "calories": 896, "protein": 0, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 99.5 },
        { "name": "Mantequilla", "calories": 749, "protein": 0.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 83 },
        { "name": "Mantequilla salada", "calories": 749, "protein": 0.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 83 },
        { "name": "Margarina", "calories": 732, "protein": 0.3, "carbs": 1, "sugar": 1, "fiber": 0, "fat": 80.7 },
        { "name": "Margarina baja en calorias", "calories": 378, "protein": 0.7, "carbs": 0.5, "sugar": 0.5, "fiber": 0, "fat": 41.5 },
        { "name": "Acedera", "calories": 33, "protein": 2, "carbs": 3.2, "sugar": 0, "fiber": 2.9, "fat": 0.7 },
        { "name": "Acelgas congeladas", "calories": 41, "protein": 2, "carbs": 4.5, "sugar": 1, "fiber": 5.6, "fat": 0.4 },
        { "name": "Acelgas frescas", "calories": 41, "protein": 2, "carbs": 4.5, "sugar": 1, "fiber": 5.6, "fat": 0.4 },
        { "name": "Achicoria", "calories": 36, "protein": 1.7, "carbs": 4.7, "sugar": 0.7, "fiber": 4, "fat": 0.3 },
        { "name": "Ajo", "calories": 118, "protein": 5.3, "carbs": 23, "sugar": 2.3, "fiber": 1.1, "fat": 0.3 },
        { "name": "Alcachofas congeladas", "calories": 44, "protein": 2.3, "carbs": 7.5, "sugar": 5.8, "fiber": 2, "fat": 0.1 },
        { "name": "Alcachofas en conserva", "calories": 44, "protein": 2.3, "carbs": 7.5, "sugar": 7.5, "fiber": 2, "fat": 0.1 },
        { "name": "Alcachofas frescas", "calories": 44, "protein": 2.3, "carbs": 7.5, "sugar": 7.5, "fiber": 2, "fat": 0.1 },
        { "name": "Algas kombu desecadas", "calories": 160, "protein": 7.1, "carbs": 0, "sugar": 0, "fiber": 58.7, "fat": 1.6 },
        { "name": "Algas musgo de Irlanda fresca", "calories": 32, "protein": 1.5, "carbs": 0, "sugar": 0, "fiber": 12.3, "fat": 0.2 },
        { "name": "Algas nori desecadas", "calories": 225, "protein": 30.7, "carbs": 0, "sugar": 0, "fiber": 44.4, "fat": 1.5 },
        { "name": "Algas wakame desecadas", "calories": 165, "protein": 12.4, "carbs": 0, "sugar": 0, "fiber": 47.1, "fat": 2.4 },
        { "name": "Algas wakame frescas", "calories": 54, "protein": 3, "carbs": 8.7, "sugar": 0.7, "fiber": 0.5, "fat": 0.64 },
        { "name": "Apio", "calories": 16, "protein": 1.3, "carbs": 1.3, "sugar": 1.3, "fiber": 1.8, "fat": 0.2 },
        { "name": "Apio en conserva en salmuera", "calories": 13, "protein": 0.8, "carbs": 1.3, "sugar": 1.3, "fiber": 2.3, "fat": 0 },
        { "name": "Batata", "calories": 101, "protein": 1.2, "carbs": 21.5, "sugar": 4.1, "fiber": 2.5, "fat": 0.6 },
        { "name": "Berenjena", "calories": 27, "protein": 1.2, "carbs": 4.4, "sugar": 4, "fiber": 1.2, "fat": 0.2 },
        { "name": "Berros", "calories": 29, "protein": 3, "carbs": 0.4, "sugar": 0.4, "fiber": 3, "fat": 1 },
        { "name": "Boniato", "calories": 101, "protein": 1.2, "carbs": 21.5, "sugar": 4.1, "fiber": 2.5, "fat": 0.6 },
        { "name": "Borraja", "calories": 28, "protein": 1.8, "carbs": 0, "sugar": 0, "fiber": 0.9, "fat": 0.7 },
        { "name": "Brecol", "calories": 38, "protein": 4.4, "carbs": 1.8, "sugar": 1.8, "fiber": 2.6, "fat": 0.9 },
        { "name": "Brotes de bambu en conserva", "calories": 26, "protein": 1.7, "carbs": 3.2, "sugar": 1.89, "fiber": 1.4, "fat": 0.4 },
        { "name": "Brotes de bambú frescos", "calories": 38, "protein": 2.6, "carbs": 5.2, "sugar": 3, "fiber": 2.2, "fat": 0.3 },
        { "name": "Calabacín", "calories": 14, "protein": 0.6, "carbs": 2.2, "sugar": 2.1, "fiber": 0.5, "fat": 0.2 },
          {
            "name": "Calabaza",
            "calories": 15,
            "protein": 0.7,
            "carbs": 2.2,
            "sugar": 1.9,
            "fiber": 1,
            "fat": 0.2
          },
          {
            "name": "Canónigos",
            "calories": 17,
            "protein": 1.8,
            "carbs": 0.7,
            "sugar": 0,
            "fiber": 1.5,
            "fat": 0.4
          },
          {
            "name": "Cardo",
            "calories": 23,
            "protein": 1.4,
            "carbs": 3.5,
            "sugar": 3,
            "fiber": 1,
            "fat": 0.2
          },
          {
            "name": "Cardo en conserva",
            "calories": 23,
            "protein": 1.4,
            "carbs": 3.5,
            "sugar": 2.9,
            "fiber": 1,
            "fat": 0.2
          },
          {
            "name": "Cebollas blanca",
            "calories": 23,
            "protein": 1.4,
            "carbs": 3.5,
            "sugar": 2.9,
            "fiber": 1,
            "fat": 0.2
          },
                  { "name": "Cebolleta", "calories": 29, "protein": 1.4, "carbs": 5.1, "sugar": 5.1, "fiber": 1.3, "fat": 0 },
                  { "name": "Cebollino", "calories": 29, "protein": 3, "carbs": 1.9, "sugar": 1.9, "fiber": 2.3, "fat": 0.5 },
                  { "name": "Chalota, escalonia", "calories": 85, "protein": 2.5, "carbs": 16.8, "sugar": 7.87, "fiber": 3.2, "fat": 0.1 },
                  { "name": "Champiñon", "calories": 31, "protein": 1.8, "carbs": 4, "sugar": 4, "fiber": 2.5, "fat": 0.3 },
                  { "name": "Champiñon en conseva", "calories": 17, "protein": 2.3, "carbs": 0.07, "sugar": 0.1, "fiber": 1.5, "fat": 0.5 },
                  { "name": "Chirivía", "calories": 70, "protein": 1.8, "carbs": 11.1, "sugar": 5.43, "fiber": 4.3, "fat": 1.1 },
                  { "name": "Chucrut en conserva", "calories": 23, "protein": 1.5, "carbs": 2.4, "sugar": 0, "fiber": 2.1, "fat": 0.3 },
                  { "name": "Col china", "calories": 33, "protein": 1.7, "carbs": 5.4, "sugar": 0, "fiber": 1, "fat": 0.3 },
                  { "name": "Col rizada", "calories": 35, "protein": 2.1, "carbs": 3.9, "sugar": 3.9, "fiber": 3.1, "fat": 0.5 },
                  { "name": "Coles", "calories": 36, "protein": 3.3, "carbs": 3.4, "sugar": 3.3, "fiber": 3.3, "fat": 0.3 },
                  { "name": "Coles de Bruselas", "calories": 51, "protein": 3.5, "carbs": 4.1, "sugar": 3.5, "fiber": 3.8, "fat": 1.4 },
                  { "name": "Coles de Bruselas congeladas", "calories": 51, "protein": 3.5, "carbs": 4.1, "sugar": 3.5, "fiber": 3.8, "fat": 1.4 },
                  { "name": "Coliflor", "calories": 27, "protein": 2.2, "carbs": 3.1, "sugar": 2.7, "fiber": 2.1, "fat": 0.2 },
                  { "name": "Coliflor congelada", "calories": 27, "protein": 2.2, "carbs": 3.1, "sugar": 2.7, "fiber": 2.1, "fat": 0.2 },
                  { "name": "Endibia", "calories": 12.9, "protein": 1.2, "carbs": 0.95, "sugar": 0.95, "fiber": 1.1, "fat": 0.23 },
                  { "name": "Escarola", "calories": 18, "protein": 1.4, "carbs": 0.95, "sugar": 0.7, "fiber": 3.1, "fat": 0.25 },
                  { "name": "Espárrago blanco en conserva", "calories": 26, "protein": 1.9, "carbs": 3.4, "sugar": 3.4, "fiber": 1, "fat": 0.3 },
                  { "name": "Espárrago blanco fresco", "calories": 18, "protein": 2.7, "carbs": 1.1, "sugar": 1.1, "fiber": 1.5, "fat": 0 },
                  { "name": "Espárrago verde fresco", "calories": 28, "protein": 2.9, "carbs": 2, "sugar": 0, "fiber": 1.7, "fat": 0.6 },
                  { "name": "Espinacas", "calories": 31, "protein": 2.6, "carbs": 1.2, "sugar": 0.9, "fiber": 6.3, "fat": 0.3 },
                  { "name": "Espinacas congeladas", "calories": 31, "protein": 2.6, "carbs": 1.2, "sugar": 0.9, "fiber": 6.3, "fat": 0.3 },
                  { "name": "Espinacas en conserva", "calories": 27, "protein": 2.2, "carbs": 0.52, "sugar": 0.5, "fiber": 6.3, "fat": 0.4 },
                  { "name": "Fécula de patata", "calories": 375, "protein": 6.9, "carbs": 83.1, "sugar": 3.52, "fiber": 5.9, "fat": 0.34 },
                  { "name": "Grelos", "calories": 19, "protein": 2.7, "carbs": 0.1, "sugar": 0.1, "fiber": 3.9, "fat": 0 },
                  { "name": "Hojas de parra", "calories": 133, "protein": 5.6, "carbs": 17.3, "sugar": 6.3, "fiber": 11, "fat": 2.12 },
                  { "name": "Hongos desecados, shiitake", "calories": 372, "protein": 9.6, "carbs": 75.4, "sugar": 2.21, "fiber": 11.5, "fat": 0.99 },
                  { "name": "Judías verdes", "calories": 37, "protein": 2.3, "carbs": 5, "sugar": 2.6, "fiber": 2.9, "fat": 0.2 },
                  { "name": "Judías verdes congeladas", "calories": 37, "protein": 2.3, "carbs": 5, "sugar": 2.9, "fiber": 2.9, "fat": 0.2 },
                  { "name": "Lechuga", "calories": 13.6, "protein": 1.34, "carbs": 1.4, "sugar": 1.4, "fiber": 1.5, "fat": 0.2 },
                  { "name": "Lechuga romana", "calories": 18.2, "protein": 1, "carbs": 1.28, "sugar": 1.28, "fiber": 1.83, "fat": 0.6 },
                  { "name": "Lechuga tipo iceberg", "calories": 14, "protein": 0.9, "carbs": 2.97, "sugar": 2.97, "fiber": 1.2, "fat": 0.14 },
                  { "name": "Lechuga, cogollos", "calories": 17, "protein": 1.5, "carbs": 1.4, "sugar": 1.4, "fiber": 1.5, "fat": 0.3 },
                  { "name": "Lombarda", "calories": 27, "protein": 1.1, "carbs": 3.7, "sugar": 3.7, "fiber": 2.5, "fat": 0.3 },
                  { "name": "Menestra congelada", "calories": 44, "protein": 3.3, "carbs": 6.6, "sugar": 3.6, "fiber": 0, "fat": 0.5 },
                  { "name": "Nabizas", "calories": 19, "protein": 2.7, "carbs": 0.1, "sugar": 0.1, "fiber": 3.9, "fat": 0 },
                  { "name": "Nabos", "calories": 32, "protein": 0.8, "carbs": 5, "sugar": 4.3, "fiber": 2.8, "fat": 0.3 },
                  { "name": "Níscalos", "calories": 24, "protein": 1.6, "carbs": 0.2, "sugar": 0.2, "fiber": 4.7, "fat": 0.8 },
                  { "name": "Palmito en conserva", "calories": 53, "protein": 2.8, "carbs": 8, "sugar": 8, "fiber": 2.4, "fat": 0.6 },
                  { "name": "Patata (b)", "calories": 88, "protein": 2.5, "carbs": 18, "sugar": 0.9, "fiber": 2, "fat": 0.2 },
                  { "name": "Patata nueva (mayo a septiembre)", "calories": 77, "protein": 1.7, "carbs": 16.1, "sugar": 0.8, "fiber": 1.3, "fat": 0.3 },
                  { "name": "Patata vieja (febrero a junio)", "calories": 82, "protein": 2.1, "carbs": 17.2, "sugar": 0.8, "fiber": 1.6, "fat": 0.2 },
                  { "name": "Pepino", "calories": 13, "protein": 0.7, "carbs": 1.9, "sugar": 1.8, "fiber": 0.5, "fat": 0.2 },
                  { "name": "Pimiento morrón", "calories": 40, "protein": 1.1, "carbs": 7, "sugar": 0.9, "fiber": 2.1, "fat": 0.4 },
                  { "name": "Pimiento rojo", "calories": 37, "protein": 1, "carbs": 6.4, "sugar": 6.4, "fiber": 1.9, "fat": 0.4 },
                  { "name": "Pimiento verde", "calories": 23, "protein": 0.9, "carbs": 3.7, "sugar": 3.5, "fiber": 1.2, "fat": 0.2 },
                    {
                      "name": "Puerro",
                      "calories": 48,
                      "protein": 2,
                      "carbs": 7.5,
                      "sugar": 7.2,
                      "fiber": 3,
                      "fat": 0.4
                    },
                    {
                      "name": "Puero en conserva",
                      "calories": 26,
                      "protein": 1.2,
                      "carbs": 2.6,
                      "sugar": 2.4,
                      "fiber": 2.4,
                      "fat": 0.7
                    },
                    {
                      "name": "Puré de patata en escamas sin reconstituir",
                      "calories": 369,
                      "protein": 9.1,
                      "carbs": 73.2,
                      "sugar": 4.5,
                      "fiber": 16.5,
                      "fat": 0.8
                    },
                    {
                      "name": "Puré de patata reconstituido con agua",
                      "calories": 66,
                      "protein": 1.5,
                      "carbs": 13.5,
                      "sugar": 0.8,
                      "fiber": 2.7,
                      "fat": 0.1
                    },
                    {
                      "name": "Puré de patata reconstituido con leche",
                      "calories": 85,
                      "protein": 2.4,
                      "carbs": 14.8,
                      "sugar": 0.9,
                      "fiber": 2.7,
                      "fat": 1.2
                    },
                    {
                      "name": "Rábamos",
                      "calories": 17,
                      "protein": 1,
                      "carbs": 2.7,
                      "sugar": 2.7,
                      "fiber": 1,
                      "fat": 0.1
                    },
                    {
                      "name": "Remolacha",
                      "calories": 37,
                      "protein": 1.3,
                      "carbs": 6.4,
                      "sugar": 6.4,
                      "fiber": 3.1,
                      "fat": 0
                    },
                    {
                      "name": "Remolacha en conserva",
                      "calories": 34,
                      "protein": 1.2,
                      "carbs": 5.6,
                      "sugar": 5.3,
                      "fiber": 2.5,
                      "fat": 0.2
                    },
                    {
                      "name": "Repollo",
                      "calories": 36,
                      "protein": 3.3,
                      "carbs": 3.4,
                      "sugar": 3.3,
                      "fiber": 3.3,
                      "fat": 0.3
                    },
                    {
                      "name": "Repollo chino",
                      "calories": 19,
                      "protein": 0.8,
                      "carbs": 2.5,
                      "sugar": 0,
                      "fiber": 1.2,
                      "fat": 0.4
                    },
                    {
                      "name": "Rúcula",
                      "calories": 34,
                      "protein": 2.6,
                      "carbs": 3.7,
                      "sugar": 2.05,
                      "fiber": 1.6,
                      "fat": 0.66
                    },
                    {
                      "name": "Setas",
                      "calories": 31,
                      "protein": 1.8,
                      "carbs": 4,
                      "sugar": 4,
                      "fiber": 2.5,
                      "fat": 0.3
                    },
                    {
                      "name": "Tapioca (harina)",
                      "calories": 382,
                      "protein": 0.5,
                      "carbs": 94.3,
                      "sugar": 0,
                      "fiber": 0.4,
                      "fat": 0.2
                    },
                    {
                      "name": "Tomate",
                      "calories": 22,
                      "protein": 1,
                      "carbs": 3.5,
                      "sugar": 3.4,
                      "fiber": 1.4,
                      "fat": 0.11
                    },
                    {
                      "name": "Tomate al natural enlatado",
                      "calories": 17,
                      "protein": 1.1,
                      "carbs": 2.3,
                      "sugar": 2.3,
                      "fiber": 0.9,
                      "fat": 0.2
                    },
                    {
                      "name": "Tomate cherry",
                      "calories": 29.4,
                      "protein": 0.8,
                      "carbs": 5,
                      "sugar": 3,
                      "fiber": 1.3,
                      "fat": 0.8
                    },
                    {
                      "name": "Trufa cruda",
                      "calories": 126,
                      "protein": 9,
                      "carbs": 13,
                      "sugar": 0,
                      "fiber": 16.5,
                      "fat": 0.5
                    },
                    {
                      "name": "Wasabi, raíz",
                      "calories": 135,
                      "protein": 4.8,
                      "carbs": 23.5,
                      "sugar": 0,
                      "fiber": 7.8,
                      "fat": 0.63
                    },
                    {
                      "name": "Yuca, mandioca, casava",
                      "calories": 164,
                      "protein": 1.4,
                      "carbs": 38.1,
                      "sugar": 1.7,
                      "fiber": 1.8,
                      "fat": 0.3
                    },
                    {
                      "name": "Zanahoria",
                      "calories": 40,
                      "protein": 0.9,
                      "carbs": 7.3,
                      "sugar": 7.3,
                      "fiber": 2.9,
                      "fat": 0.2
                    },
                    {
                      "name": "Zanahoria en conserva",
                      "calories": 29,
                      "protein": 0.6,
                      "carbs": 4.4,
                      "sugar": 4,
                      "fiber": 2.7,
                      "fat": 0.4
                    },
                    {
                      "name": "Altramuces",
                      "calories": 394,
                      "protein": 36.2,
                      "carbs": 40.4,
                      "sugar": 0,
                      "fiber": 0,
                      "fat": 9.74
                    },
                    {
                      "name": "Alubias",
                      "calories": 349,
                      "protein": 19,
                      "carbs": 52.5,
                      "sugar": 3,
                      "fiber": 25.4,
                      "fat": 1.4
                    },
                    {
                      "name": "Arveja",
                      "calories": 342,
                      "protein": 24.6,
                      "carbs": 45.4,
                      "sugar": 0,
                      "fiber": 25.5,
                      "fat": 1.2
                    },
                    {
                      "name": "Brotes de lenteja",
                      "calories": 129,
                      "protein": 9,
                      "carbs": 22.1,
                      "sugar": 0,
                      "fiber": 0,
                      "fat": 0.55
                    },
                    {
                      "name": "Frijol negro",
                      "calories": 364,
                      "protein": 22.7,
                      "carbs": 55.6,
                      "sugar": 0,
                      "fiber": 18.4,
                      "fat": 1.6
                    },
                    {
                      "name": "Frijol rojo o poroto",
                      "calories": 368,
                      "protein": 22.5,
                      "carbs": 59.5,
                      "sugar": 0,
                      "fiber": 15.2,
                      "fat": 1.1
                    },
                    {
                      "name": "Garbanzo",
                      "calories": 373,
                      "protein": 19.4,
                      "carbs": 55,
                      "sugar": 3,
                      "fiber": 15,
                      "fat": 5
                    },
                    {
                      "name": "Garrofón seco",
                      "calories": 384,
                      "protein": 21.5,
                      "carbs": 63.4,
                      "sugar": 8.5,
                      "fiber": 19,
                      "fat": 0.69
                    },
                    {
                      "name": "Guisante congelado",
                      "calories": 80,
                      "protein": 5.3,
                      "carbs": 10,
                      "sugar": 5.7,
                      "fiber": 7.8,
                      "fat": 0.4
                    },
                    {
                      "name": "Guisante en conserva",
                      "calories": 72,
                      "protein": 5.6,
                      "carbs": 9.7,
                      "sugar": 2,
                      "fiber": 3.36,
                      "fat": 0.5
                    },
                    {
                      "name": "Guisante fresco con vaina",
                      "calories": 91,
                      "protein": 6,
                      "carbs": 13.1,
                      "sugar": 1.4,
                      "fiber": 5.2,
                      "fat": 0.5
                    },
                    {
                      "name": "Guisante fresco desgranado",
                      "calories": 91,
                      "protein": 6,
                      "carbs": 13.1,
                      "sugar": 1.4,
                      "fiber": 5.2,
                      "fat": 0.5
                    },
                    {
                      "name": "Guisante  seco",
                      "calories": 365,
                      "protein": 21.6,
                      "carbs": 56,
                      "sugar": 4.2,
                      "fiber": 16.7,
                      "fat": 2.3
                    },
                    {
                      "name": "Habas frescas con vaina",
                      "calories": 65,
                      "protein": 4.6,
                      "carbs": 8.6,
                      "sugar": 0.8,
                      "fiber": 4.2,
                      "fat": 0.4
                    },
                    {
                      "name": "Habas frescas  desgranadas",
                      "calories": 65,
                      "protein": 4.6,
                      "carbs": 8.6,
                      "sugar": 0.8,
                      "fiber": 4.2,
                      "fat": 0.4
                    },
                    {
                      "name": "Habas secas",
                      "calories": 372,
                      "protein": 23,
                      "carbs": 56,
                      "sugar": 4.2,
                      "fiber": 19,
                      "fat": 2
                    },
                    {
                      "name": "Harina de algarrobo",
                      "calories": 459,
                      "protein": 4.6,
                      "carbs": 88.9,
                      "sugar": 49.08,
                      "fiber": 39.8,
                      "fat": 0.65
                    },
                    {
                      "name": "Harina d Soja",
                      "calories": 475,
                      "protein": 36.8,
                      "carbs": 23.5,
                      "sugar": 12.7,
                      "fiber": 11.2,
                      "fat": 23.5
                    },
                    {
                      "name": "Judías blancas en conserva",
                      "calories": 100,
                      "protein": 6.7,
                      "carbs": 15.7,
                      "sugar": 1,
                      "fiber": 4.4,
                      "fat": 0.2
                    },
                    {
                      "name": "Judías blancas, judías pintas",
                      "calories": 349,
                      "protein": 19,
                      "carbs": 52.5,
                      "sugar": 3,
                      "fiber": 25.4,
                      "fat": 1.4
                    },
                    {
                      "name": "Leche de Soja",
                      "calories": 100,
                      "protein": 32,
                      "carbs": 0.8,
                      "sugar": 0.8,
                      "fiber": 0,
                      "fat": 1.9
                    },
                    {
                      "name": "Lenteja",
                      "calories": 351,
                      "protein": 23.8,
                      "carbs": 54,
                      "sugar": 1.5,
                      "fiber": 11.7,
                      "fat": 1.8
                    },
                    {
                      "name": "Lenteja en conserva",
                      "calories": 83,
                      "protein": 6.3,
                      "carbs": 11.4,
                      "sugar": 0.7,
                      "fiber": 5.1,
                      "fat": 0.2
                    },
                    {
                      "name": "Miso",
                      "calories": 218,
                      "protein": 11.7,
                      "carbs": 26.5,
                      "sugar": 6.2,
                      "fiber": 5.4,
                      "fat": 6.01
                    },
                    {
                      "name": "Salsicha vegetales",
                      "calories": 283,
                      "protein": 18.5,
                      "carbs": 9.8,
                      "sugar": 0,
                      "fiber": 2.8,
                      "fat": 18.16
                    },
                    {
                      "name": "Soja seca",
                      "calories": 406,
                      "protein": 35.9,
                      "carbs": 15.8,
                      "sugar": 8.6,
                      "fiber": 15.7,
                      "fat": 18.6
                    },
                    {
                      "name": "Soja, brotes, en conserva",
                      "calories": 55,
                      "protein": 5.5,
                      "carbs": 4.7,
                      "sugar": 2.3,
                      "fiber": 2.4,
                      "fat": 1
                    },
                    {
                      "name": "Tempeh",
                      "calories": 209,
                      "protein": 18.5,
                      "carbs": 9.4,
                      "sugar": 0,
                      "fiber": 0,
                      "fat": 10.8
                    },
                    {
                      "name": "Tofu",
                      "calories": 74,
                      "protein": 8.1,
                      "carbs": 0.7,
                      "sugar": 0.3,
                      "fiber": 0.3,
                      "fat": 4.2
                    },
                    {
                      "name": "Aguacate",
                      "calories": 141,
                      "protein": 1.5,
                      "carbs": 5.9,
                      "sugar": 5.9,
                      "fiber": 1.8,
                      "fat": 12
                    },
                    {
                      "name": "Albaricoque",
                      "calories": 45,
                      "protein": 0.8,
                      "carbs": 9.5,
                      "sugar": 9.5,
                      "fiber": 2.1,
                      "fat": 0
                    },
                      { "name": "Arándano", "calories": 42, "protein": 0.6, "carbs": 6.1, "sugar": 6.1, "fiber": 4.9, "fat": 0.6 },
                      { "name": "Caqui, kaki o palosanto", "calories": 73, "protein": 0.7, "carbs": 16, "sugar": 16, "fiber": 1.6, "fat": 0.3 },
                      { "name": "Cerezas, guindas", "calories": 65, "protein": 0.8, "carbs": 13.5, "sugar": 13.5, "fiber": 1.5, "fat": 0.5 },
                      { "name": "Chirimoya", "calories": 90, "protein": 1, "carbs": 20, "sugar": 20, "fiber": 1.9, "fat": 0.2 },
                      { "name": "Ciruela", "calories": 51, "protein": 0.6, "carbs": 11, "sugar": 11, "fiber": 2.1, "fat": 0 },
                      { "name": "Ciruela amarilla", "calories": 61.8, "protein": 0.72, "carbs": 12.4, "sugar": 12.4, "fiber": 2.3, "fat": 0.2 },
                      { "name": "Ciruela Claudia", "calories": 48.7, "protein": 0.8, "carbs": 9.6, "sugar": 9.6, "fiber": 2.3, "fat": 0.28 },
                      { "name": "Frambuesa", "calories": 40, "protein": 1.4, "carbs": 4.6, "sugar": 4.6, "fiber": 6.7, "fat": 0.3 },
                      { "name": "Fresa, fresón", "calories": 40, "protein": 0.7, "carbs": 7, "sugar": 7, "fiber": 2.2, "fat": 0.5 },
                      { "name": "Granada", "calories": 34, "protein": 0.7, "carbs": 7.5, "sugar": 7.5, "fiber": 0.2, "fat": 0.1 },
                      { "name": "Grosella negra", "calories": 45, "protein": 1.3, "carbs": 6.1, "sugar": 6.1, "fiber": 6.8, "fat": 0.2 },
                      { "name": "Grosella roja", "calories": 32, "protein": 1.1, "carbs": 4.8, "sugar": 4.8, "fiber": 3.5, "fat": 0.2 },
                      { "name": "Guayaba", "calories": 42, "protein": 0.9, "carbs": 5.8, "sugar": 5.8, "fiber": 5.2, "fat": 0.5 },
                      { "name": "Higos, brevas", "calories": 74, "protein": 1.2, "carbs": 16, "sugar": 16, "fiber": 2.5, "fat": 0 },
                      { "name": "Kiwi", "calories": 55, "protein": 1.1, "carbs": 10.6, "sugar": 10.6, "fiber": 1.9, "fat": 0.5 },
                      { "name": "Lichi", "calories": 75, "protein": 0.8, "carbs": 16.5, "sugar": 0, "fiber": 1.3, "fat": 0.4 },
                      { "name": "Lichi en conserva", "calories": 121, "protein": 0.9, "carbs": 27, "sugar": 0, "fiber": 1.3, "fat": 0.3 },
                      { "name": "Lichi, pulpa, crudo", "calories": 69.4, "protein": 0.815, "carbs": 14, "sugar": 14, "fiber": 1.3, "fat": 0.42 },
                      { "name": "Lima", "calories": 17, "protein": 0.5, "carbs": 1.9, "sugar": 1.9, "fiber": 2.8, "fat": 0.2 },
                      { "name": "Limón", "calories": 44, "protein": 0.7, "carbs": 9, "sugar": 9, "fiber": 1, "fat": 0.4 },
                      { "name": "Mandarina", "calories": 43, "protein": 0.8, "carbs": 9, "sugar": 9, "fiber": 1.9, "fat": 0 },
                      { "name": "Mango", "calories": 67, "protein": 0.7, "carbs": 14.1, "sugar": 13.8, "fiber": 2.9, "fat": 0.2 },
                      { "name": "Manzana", "calories": 53, "protein": 0.3, "carbs": 12, "sugar": 11.4, "fiber": 2, "fat": 0 },
                      { "name": "Manzana al horno(con piel)", "calories": 54, "protein": 0.5, "carbs": 12.9, "sugar": 12.87, "fiber": 0, "fat": 0.1 },
                      { "name": "Maracuyá (fruta de la pasión)", "calories": 54, "protein": 2.4, "carbs": 9.5, "sugar": 9.5, "fiber": 1.5, "fat": 0.4 },
                      { "name": "Melocotón", "calories": 41, "protein": 0.6, "carbs": 9, "sugar": 9, "fiber": 1.4, "fat": 0 },
                      { "name": "Melón", "calories": 28, "protein": 0.6, "carbs": 6, "sugar": 6, "fiber": 1, "fat": 0 },
                      { "name": "Melón tipo Cantaloupe", "calories": 35, "protein": 0.7, "carbs": 7.4, "sugar": 7.4, "fiber": 0.9, "fat": 0.1 },
                      { "name": "Membrillo", "calories": 42, "protein": 0.4, "carbs": 6.8, "sugar": 6.8, "fiber": 6.4, "fat": 0 },
                      { "name": "Mora", "calories": 39, "protein": 0.9, "carbs": 5.1, "sugar": 5.1, "fiber": 6.6, "fat": 0.2 },
                      { "name": "Naranja", "calories": 42, "protein": 0.8, "carbs": 8.6, "sugar": 8.6, "fiber": 2, "fat": 0 },
                      { "name": "Nectarina", "calories": 47, "protein": 1.4, "carbs": 9, "sugar": 9, "fiber": 2.2, "fat": 0.1 },
                      { "name": "Níspero", "calories": 69, "protein": 0.4, "carbs": 10.6, "sugar": 10.6, "fiber": 10.2, "fat": 0.5 },
                      { "name": "Papaya", "calories": 43, "protein": 0.5, "carbs": 8.8, "sugar": 8.8, "fiber": 2.3, "fat": 0.1 },
                      { "name": "Pera", "calories": 49, "protein": 0.4, "carbs": 10.6, "sugar": 10.6, "fiber": 2.3, "fat": 0 },
                      { "name": "Picotas", "calories": 65, "protein": 0.8, "carbs": 13.5, "sugar": 13.5, "fiber": 1.5, "fat": 0.5 },
                      { "name": "Piña", "calories": 50, "protein": 0.5, "carbs": 11.5, "sugar": 11.5, "fiber": 1.2, "fat": 0 },
                      { "name": "Plátano", "calories": 94, "protein": 1.2, "carbs": 20, "sugar": 16.9, "fiber": 3.4, "fat": 0.3 },
                      { "name": "Plátano macho o hartón", "calories": 141, "protein": 1.3, "carbs": 31.9, "sugar": 15, "fiber": 2.3, "fat": 0.37 },
                      { "name": "Pomelo", "calories": 35, "protein": 0.8, "carbs": 6.8, "sugar": 6.8, "fiber": 1.6, "fat": 0.1 },
                      { "name": "Sandía", "calories": 21, "protein": 0.4, "carbs": 4.5, "sugar": 4.5, "fiber": 0.5, "fat": 0 },
                      { "name": "Tamarindo", "calories": 277, "protein": 2.8, "carbs": 62.5, "sugar": 57.4, "fiber": 5.1, "fat": 0.6 },
                      { "name": "Tamarindo, pulpa", "calories": 277, "protein": 2.8, "carbs": 62.5, "sugar": 57.4, "fiber": 5.1, "fat": 0.6 },
                      { "name": "Uvas blancas", "calories": 69, "protein": 0.6, "carbs": 16.1, "sugar": 16.1, "fiber": 0.9, "fat": 0 },
                      { "name": "Uvas negras", "calories": 69, "protein": 0.6, "carbs": 15.5, "sugar": 15.5, "fiber": 0.4, "fat": 0 },
                        {"name": "Macedonia de frutas en almibar", "calories": 63, "protein": 0.4, "carbs": 14.8, "sugar": 14.8, "fiber": 1, "fat": 0},
                        {"name": "Macedonia de frutas en su jugo", "calories": 32, "protein": 0.4, "carbs": 7.2, "sugar": 7.2, "fiber": 1, "fat": 0},
                        {"name": "Melocotón en almibar", "calories": 92, "protein": 0.4, "carbs": 22, "sugar": 22, "fiber": 1, "fat": 0},
                        {"name": "Pera en almibar", "calories": 67, "protein": 0.3, "carbs": 16, "sugar": 16, "fiber": 1.1, "fat": 0},
                        {"name": "Piña en almibar", "calories": 87, "protein": 0.3, "carbs": 21, "sugar": 21, "fiber": 0.9, "fat": 0},
                        {"name": "Piña enlatada en su jugo", "calories": 52, "protein": 0.3, "carbs": 12.2, "sugar": 12.2, "fiber": 0.8, "fat": 0},
                        {"name": "Albaricoque desecado (orejones)", "calories": 2.42, "protein": 4.8, "carbs": 43.4, "sugar": 43.2, "fiber": 100, "fat": 0.7},
                        {"name": "Ciruela seca con hueso", "calories": 201, "protein": 2.3, "carbs": 40, "sugar": 40, "fiber": 100, "fat": 0},
                        {"name": "Ciruela seca sin hueso", "calories": 201, "protein": 2.3, "carbs": 40, "sugar": 40, "fiber": 100, "fat": 0},
                        {"name": "Dátil seco con hueso", "calories": 314, "protein": 2.2, "carbs": 71, "sugar": 71, "fiber": 100, "fat": 0.4},
                        {"name": "Dátil seco sin hueso", "calories": 314, "protein": 2.2, "carbs": 71, "sugar": 71, "fiber": 100, "fat": 0.4},
                        {"name": "Higos secos", "calories": 281, "protein": 3.5, "carbs": 53, "sugar": 53, "fiber": 100, "fat": 2},
                        {"name": "Pasas", "calories": 286, "protein": 1.4, "carbs": 66, "sugar": 66, "fiber": 100, "fat": 0.3},
                        {"name": "Almendra frita salada", "calories": 628, "protein": 19, "carbs": 4.5, "sugar": 2.8, "fiber": 15, "fat": 55.96},
                        {"name": "Almendra sin cáscara", "calories": 604, "protein": 19, "carbs": 4.5, "sugar": 2.1, "fiber": 14.3, "fat": 53.5},
                        {"name": "Almendra tostada", "calories": 648, "protein": 21.2, "carbs": 6.6, "sugar": 4.17, "fiber": 13.3, "fat": 56.7},
                        {"name": "Anacardo sin cáscara", "calories": 584, "protein": 17.5, "carbs": 32, "sugar": 6.4, "fiber": 2.9, "fat": 42.2},
                        {"name": "avellana sin cáscara", "calories": 587, "protein": 14.1, "carbs": 5.3, "sugar": 3.6, "fiber": 10, "fat": 54.4},
                        {"name": "cacahuete cubierto de chocolate", "calories": 514, "protein": 9.36, "carbs": 60.5, "sugar": 53.5, "fiber": 2.7, "fat": 25.4},
                        {"name": "cacahuete sin cáscara", "calories": 599, "protein": 27, "carbs": 8.5, "sugar": 4.3, "fiber": 8.1, "fat": 49},
                        {"name": "cacahuete tostado y salado, sin cáscara", "calories": 598, "protein": 27.3, "carbs": 9.7, "sugar": 3.6, "fiber": 11.4, "fat": 47.4},
                        {"name": "Crema de cacahuete", "calories": 619, "protein": 25.5, "carbs": 11.2, "sugar": 5.7, "fiber": 7, "fat": 50.9},
                        {"name": "castaña", "calories": 209, "protein": 3, "carbs": 40, "sugar": 13.5, "fiber": 6.8, "fat": 2.6},
                        {"name": "castaña asada", "calories": 237, "protein": 4, "carbs": 39.7, "sugar": 7.9, "fiber": 7.1, "fat": 5.3},
                        {"name": "castaña, puré", "calories": 131, "protein": 2, "carbs": 27.8, "sugar": 0, "fiber": 1.32, "fat": 1.38},
                        {"name": "chufa", "calories": 443, "protein": 6.1, "carbs": 42.5, "sugar": 14.7, "fiber": 17.4, "fat": 23.7},
                        {"name": "coco fresco", "calories": 373, "protein": 3.2, "carbs": 3.7, "sugar": 3.7, "fiber": 10.5, "fat": 36},
                        {"name": "coco rallado", "calories": 648, "protein": 5.6, "carbs": 6.4, "sugar": 6.4, "fiber": 21.1, "fat": 62},
                        {"name": "coco, agua", "calories": 17, "protein": 0.7, "carbs": 2.6, "sugar": 2.6, "fiber": 1.1, "fat": 0.2},
                        {"name": "coco, leche", "calories": 241, "protein": 2.3, "carbs": 3.3, "sugar": 3.3, "fiber": 2.2, "fat": 23.8},
                        {"name": "frutos secos, mezcla", "calories": 625, "protein": 22.9, "carbs": 7.9, "sugar": 3.5, "fiber": 7.5, "fat": 54.1},
                        {"name": "nueces con cascara", "calories": 611, "protein": 14, "carbs": 3.3, "sugar": 2.6, "fiber": 5.3, "fat": 59},
                        {"name": "nueces de brazil sin cascara", "calories": 697, "protein": 14.4, "carbs": 2.73, "sugar": 2.17, "fiber": 8.1, "fat": 68.2},
                        {"name": "nueces de macadamia sin cascara", "calories": 744, "protein": 7.9, "carbs": 4.8, "sugar": 4, "fiber": 5.3, "fat": 75.8},
                        {"name": "nueces pecanas sin cascara", "calories": 737, "protein": 9.3, "carbs": 2.94, "sugar": 3.64, "fiber": 9.52, "fat": 73.8},
                        {"name": "nueces sin cascara", "calories": 611, "protein": 14, "carbs": 3.3, "sugar": 2.6, "fiber": 5.3, "fat": 59},
                        {"name": "piñones sin cascara", "calories": 693, "protein": 14, "carbs": 4, "sugar": 3.9, "fiber": 1.9, "fat": 68.6},
                        {"name": "pipas de calabaza seca con cascaras", "calories": 617, "protein": 30.2, "carbs": 10.7, "sugar": 1.4, "fiber": 6, "fat": 49.1},
                        {"name": "pipas de calabaza sin cascara tostadas sin sal", "calories": 633, "protein": 29.9, "carbs": 14.7, "sugar": 1.29, "fiber": 6.5, "fat": 49.1},
                        {"name": "pipas de girasol con cascara", "calories": 580, "protein": 27, "carbs": 20, "sugar": 2.1, "fiber": 2.7, "fat": 43},
                        {"name": "pipas de girasol sin cascara", "calories": 580, "protein": 27, "carbs": 20, "sugar": 1.6, "fiber": 2.7, "fat": 43},
                        {"name": "pistachos con cascara", "calories": 611, "protein": 17.6, "carbs": 15.7, "sugar": 11, "fiber": 6.5, "fat": 51.6},
                        {"name": "pistachos tostado, salado, cascara", "calories": 616, "protein": 18, "carbs": 12.6, "sugar": 8.8, "fiber": 8.5, "fat": 53},
                        {"name": "sesamo, semilla ajonjoli", "calories": 614, "protein": 18.2, "carbs": 0.9, "sugar": 0.4, "fiber": 7.9, "fat": 58},
                        {"name": "tahine o pasta de sesamo", "calories": 642, "protein": 17.4, "carbs": 21.5, "sugar": 0, "fiber": 4.7, "fat": 53},
                        {"name": "Beicon o panceta ahumada", "calories": 301, "protein": 16, "carbs": 0.5, "sugar": 0.5, "fiber": 0, "fat": 26.1},
                        {"name": "Cerdo, carne madra", "calories": 155, "protein": 20, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 8.3},
                        {"name": "Cerdo, carne semigrasa", "calories": 273, "protein": 16.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 23},
                        {"name": "Cerdo, chuleta", "calories": 327, "protein": 15.4, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 29.5},
                        {"name": "Cerdo, lomo (3% grasa)", "calories": 104, "protein": 20, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 2.65},
                        {"name": "Cerdo, lomo (9% grasa)", "calories": 152, "protein": 18, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 8.85},
                        {"name": "Cerdo, paletilla", "calories": 349, "protein": 21.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 29.2},
                        {"name": "Cerdo, solomillo", "calories": 130, "protein": 21, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 5.1},
                        {"name": "Panceta", "calories": 469, "protein": 12.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 46.6},
                        {"name": "Tocino", "calories": 673, "protein": 8.4, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 71},
                        {"name": "Cordero, chuleta", "calories": 225, "protein": 18, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 17},
                        {"name": "Cordero, otras piezas", "calories": 357, "protein": 15.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 32.7},
                        {"name": "Cordero, pierna  paletilla", "calories": 240, "protein": 17.9, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 18.7},
                        {"name": "Buey, solomillo", "calories": 104, "protein": 18.2, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 3.5},
                        {"name": "Rabo de toro", "calories": 200, "protein": 18.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 14},
                        {"name": "Ternera, carne magra", "calories": 131, "protein": 20.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 5.4},
                        {"name": "Ternera, carne semigrasa", "calories": 256, "protein": 16.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 21},
                        {"name": "Ternera, chuleta", "calories": 253, "protein": 17, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 20.5},
                        {"name": "Avestruz, filete", "calories": 117, "protein": 22.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 3.19},
                        {"name": "Capón asado", "calories": 221, "protein": 29, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 11.7},
                        {"name": "Codorniz", "calories": 106, "protein": 23, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.6},
                        {"name": "Gallina", "calories": 167, "protein": 20, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 9.7},
                        {"name": "Oca, deshuesada, sin piel", "calories": 155, "protein": 22.8, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 7.13},
                        { "name": "Oca, entera", "calories": 366, "protein": 15.9, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 33.6 },
{ "name": "Paloma", "calories": 288, "protein": 18.65, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 23.8 },
{ "name": "Pato", "calories": 214, "protein": 22, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 14 },
{ "name": "Pavo, deshuesado, sin piel", "calories": 107, "protein": 21.9, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 2.2 },
{ "name": "Pavo, muslo con piel", "calories": 151, "protein": 18.9, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 8.36 },
{ "name": "Pavo, pechuga sin piel", "calories": 100, "protein": 21.9, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
{ "name": "Pavo, sin piel", "calories": 109, "protein": 21.9, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 2.4 },
{ "name": "Perdiz", "calories": 106, "protein": 23, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.6 },
{ "name": "Pollo", "calories": 167, "protein": 20, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 9.7 },
{ "name": "Pollo, pechuga", "calories": 112, "protein": 21.8, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 2.8 },
{ "name": "Ballena, carne de", "calories": 123, "protein": 23.2, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 3.38 },
{ "name": "Caballo, carne de", "calories": 93, "protein": 21, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1 },
{ "name": "Cabrito", "calories": 113, "protein": 19.3, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 4 },
{ "name": "Carne de venado magra deshuesada", "calories": 103, "protein": 22.2, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.6 },
{ "name": "Carne picada", "calories": 245, "protein": 15.2, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 20.5 },
{ "name": "Conejo, liebre", "calories": 133, "protein": 23, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 4.6 },
{ "name": "Jabalí, carne de", "calories": 109, "protein": 19.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 3.4 },
{ "name": "Callos de ternera", "calories": 81, "protein": 14.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 2.5 },
{ "name": "Hígado de cerdo", "calories": 135, "protein": 21, "carbs": 1.5, "sugar": 0, "fiber": 0, "fat": 5 },
{ "name": "Hígado de ternera", "calories": 132, "protein": 20.5, "carbs": 1.6, "sugar": 0, "fiber": 0, "fat": 4.8 },
{ "name": "Lengua de ternera", "calories": 190, "protein": 16.8, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 23.6 },
{ "name": "Mollejas de cordero", "calories": 131, "protein": 15.3, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 7.8 },
{ "name": "Riñones", "calories": 110, "protein": 16, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 5.1 },
{ "name": "Sangre de cerdo", "calories": 81, "protein": 18, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1 },
{ "name": "Sesos de cordero", "calories": 113, "protein": 10.3, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 8 },
{ "name": "Butifarra", "calories": 265, "protein": 15, "carbs": 5.5, "sugar": 2.8, "fiber": 0, "fat": 20.3 },
{ "name": "Cabeza de cerdo", "calories": 540, "protein": 20.4, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 50.6 },
{ "name": "Cabeza de jabalí", "calories": 540, "protein": 20.4, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 50.6 },
{ "name": "Chicharrones", "calories": 540, "protein": 20.4, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 50.6 },
{ "name": "Chistorra", "calories": 514, "protein": 17.4, "carbs": 0.9, "sugar": 0.87, "fiber": 0, "fat": 49 },
{ "name": "Chóped", "calories": 311, "protein": 14, "carbs": 3, "sugar": 0, "fiber": 0, "fat": 27 },
{ "name": "Chorizo (21% grasa)", "calories": 285, "protein": 22, "carbs": 2, "sugar": 2, "fiber": 0, "fat": 21 },
{ "name": "Chorizo (32% grasa)", "calories": 385, "protein": 22, "carbs": 2, "sugar": 2, "fiber": 0, "fat": 32.1 },
{ "name": "Foie-gras de hígado de cerdo (30% grasa) (f)", "calories": 342, "protein": 14, "carbs": 5, "sugar": 5, "fiber": 0, "fat": 29.5 },
{ "name": "Foie-gras de hígado de cerdo (42% grasa) (f)", "calories": 454, "protein": 14, "carbs": 5, "sugar": 5, "fiber": 0, "fat": 42 },
{ "name": "Fuet", "calories": 400, "protein": 30.2, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 31 },
{ "name": "Jamón cocido (York, dulce, etc.)", "calories": 175, "protein": 18.4, "carbs": 1, "sugar": 1, "fiber": 0, "fat": 10.8 },
{ "name": "Jamón ibérico", "calories": 254, "protein": 30.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 14.7 },
{ "name": "Jamón serrano", "calories": 241, "protein": 31, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 13 },
{ "name": "Jamón serrano magro", "calories": 163, "protein": 30.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 4.5 },
{ "name": "Lacón", "calories": 349, "protein": 21.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 29.2 },
{ "name": "Lomo embuchado", "calories": 386, "protein": 50, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 20.7 },
{ "name": "Morcilla", "calories": 446, "protein": 19.5, "carbs": 3, "sugar": 0.4, "fiber": 0, "fat": 39.5 },
{ "name": "Mortadela", "calories": 311, "protein": 14, "carbs": 3, "sugar": 0, "fiber": 0, "fat": 27 },
{ "name": "Paté de hígado de cerdo (30% grasa) (f)", "calories": 342, "protein": 14, "carbs": 5, "sugar": 5, "fiber": 0, "fat": 29.5 },
{ "name": "Paté de hígado de cerdo (42% grasa) (f)", "calories": 454, "protein": 14, "carbs": 5, "sugar": 5, "fiber": 0, "fat": 42 },
{
  "name": "Salami",
  "calories": 459,
  "protein": 18.5,
  "carbs": 1.8,
  "sugar": 0,
  "fiber": 0,
  "fat": 42
},
{
  "name": "Salchichas frescas",
  "calories": 295,
  "protein": 12.9,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 27
},
{
  "name": "Salchichas tipo Frankfurt (20% grasa)",
  "calories": 236,
  "protein": 12,
  "carbs": 3,
  "sugar": 1.4,
  "fiber": 0,
  "fat": 19.5
},
{
  "name": "Salchichas tipo Frankfurt (27% grasa)",
  "calories": 303,
  "protein": 12,
  "carbs": 3,
  "sugar": 1.4,
  "fiber": 0,
  "fat": 27
},
{
  "name": "Salchichón",
  "calories": 454,
  "protein": 25.8,
  "carbs": 2,
  "sugar": 0.1,
  "fiber": 0,
  "fat": 38.1
},
{
  "name": "Sobrasada",
  "calories": 650,
  "protein": 10.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 67.5
},
{
  "name": "Abadejo",
  "calories": 76,
  "protein": 17.4,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.75
},
{
  "name": "Anchoas",
  "calories": 127,
  "protein": 17.6,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 6.3
},
{
  "name": "Anguila",
  "calories": 205,
  "protein": 16.3,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 15.5
},
{
  "name": "Angula",
  "calories": 205,
  "protein": 16.3,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 15.5
},
{
  "name": "Arenque",
  "calories": 153,
  "protein": 18,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 9
},
{
  "name": "Atún",
  "calories": 200,
  "protein": 23,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 12
},
{
  "name": "Bacaladilla",
  "calories": 76,
  "protein": 17.4,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.7
},
{
  "name": "Bacalo fresco",
  "calories": 74,
  "protein": 17.7,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.4
},
{
  "name": "Besugo",
  "calories": 86,
  "protein": 17,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 2
},
{
  "name": "Bonito",
  "calories": 138,
  "protein": 21,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 6
},
{
  "name": "Boquerón",
  "calories": 127,
  "protein": 17.6,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 6.3
},
{
  "name": "Breca",
  "calories": 71,
  "protein": 15.4,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1
},
{
  "name": "Caballa",
  "calories": 150,
  "protein": 15,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 10
},
{
  "name": "Cabracho",
  "calories": 91,
  "protein": 19,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.7
},
{
  "name": "Caviar",
  "calories": 277,
  "protein": 25,
  "carbs": 4,
  "sugar": 0,
  "fiber": 0,
  "fat": 17.9
},
{
  "name": "Chanquete y otros pescaditos pequeños",
  "calories": 73,
  "protein": 11.4,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 3
},
{
  "name": "Chicharro",
  "calories": 124,
  "protein": 15.7,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 6.8
},
{
  "name": "Congrio",
  "calories": 101,
  "protein": 19,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 2.8
},
{
  "name": "Dorada",
  "calories": 77,
  "protein": 17,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1
},
{
  "name": "Emperador",
  "calories": 107,
  "protein": 17,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 4.3
},
{
  "name": "Faneca",
  "calories": 71,
  "protein": 15.4,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1
},
{
  "name": "Gallo",
  "calories": 80,
  "protein": 15.8,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.9
},
{
  "name": "Gulas refrigeradas/congeladas",
  "calories": 70,
  "protein": 10,
  "carbs": 6.6,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.4
},
{
  "name": "halibut o fletán",
  "calories": 103,
  "protein": 21.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.9
},
{
  "name": "halibut o fletán en filetes",
  "calories": 103,
  "protein": 21.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.9
},
{
  "name": "Huevas frescas",
  "calories": 113,
  "protein": 24.3,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.8
},
{
  "name": "Japuta",
  "calories": 125,
  "protein": 20,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 5
},
{
  "name": "Jurel",
  "calories": 124,
  "protein": 15.7,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 6.8
},
{
  "name": "Lampuja",
  "calories": 80,
  "protein": 18.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.7
},
{
  "name": "Lampuja en fietes",
  "calories": 80,
  "protein": 18.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.7
},
{
  "name": "Lenguado",
  "calories": 78,
  "protein": 16.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.3
},
{
  "name": "Lenguado en filete",
  "calories": 78,
  "protein": 16.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.3
},
{
  "name": "Lubina",
  "calories": 84,
  "protein": 18,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.3
},
{
  "name": "Merluza",
  "calories": 89,
  "protein": 15.9,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 2.8
},
{
  "name": "Merluza congelada, lomo, corazones",
  "calories": 89,
  "protein": 15.9,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 2.8
},
{
  "name": "Merluza en filete si piel",
  "calories": 89,
  "protein": 15.9,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 2.8
},
{
  "name": "Mero",
  "calories": 92,
  "protein": 17.8,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 2.3
},
{
  "name": "Mujol, pardete",
  "calories": 124,
  "protein": 15.8,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 6.8
},
{
  "name": "Palitos de camgrejo congelados",
  "calories": 70,
  "protein": 10,
  "carbs": 6.6,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.4
},
{
  "name": "Palometas",
  "calories": 125,
  "protein": 20,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 5
},
{
  "name": "Panga, filete",
  "calories": 78,
  "protein": 16.5,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 1.3
},
{
  "name": "Perca, filete",
  "calories": 86,
  "protein": 19.4,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.92
},
{
  "name": "Pescadilla",
  "calories": 69,
  "protein": 16,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.6
},
{
  "name": "Pescadilla en filete sin piel",
  "calories": 69,
  "protein": 16,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.6
},
{
  "name": "Pez espada",
  "calories": 107,
  "protein": 17,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 4.3
},
{
  "name": "Rape",
  "calories": 78,
  "protein": 18.7,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.3
},
{
  "name": "Raya",
  "calories": 77,
  "protein": 17.1,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 0.9
},
{
  "name": "Reo",
  "calories": 182,
  "protein": 18.4,
  "carbs": 0,
  "sugar": 0,
  "fiber": 0,
  "fat": 12
},
  { "name": "Rodaballo", "calories": 97, "protein": 16.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 3.6 },
  { "name": "Salmón", "calories": 182, "protein": 18.4, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 12 },
  { "name": "Salmonete", "calories": 90, "protein": 14.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 3.7 },
  { "name": "Sardina", "calories": 140, "protein": 18.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 7.5 },
  { "name": "Sargo", "calories": 100, "protein": 15, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 4.4 },
  { "name": "Trucha", "calories": 90, "protein": 15.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 3 },
  { "name": "Amejas", "calories": 47, "protein": 10.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.5 },
  { "name": "Ancas de ranas", "calories": 68, "protein": 16.4, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.3 },
  { "name": "Berberechos", "calories": 47, "protein": 10.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.5 },
  { "name": "Bígaro hervido", "calories": 94, "protein": 20.8, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.2 },
  { "name": "Bogavante", "calories": 91, "protein": 18.3, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 2 },
  { "name": "Calamar aros congelados", "calories": 80, "protein": 17, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.3 },
  { "name": "Calamares y similares", "calories": 80, "protein": 17, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.3 },
  { "name": "Cangrejos y similares", "calories": 124, "protein": 19.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 5.1 },
  { "name": "Caracoles", "calories": 78, "protein": 16.3, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
  { "name": "Centollo", "calories": 127, "protein": 20.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 5.2 },
  { "name": "Chipiron", "calories": 82, "protein": 16.3, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
  { "name": "Chirlas", "calories": 47, "protein": 10.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.5 },
  { "name": "Cigalas", "calories": 93, "protein": 20.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
  { "name": "Gambas", "calories": 93, "protein": 20.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
  { "name": "Gambas congeladas, peladas", "calories": 93, "protein": 20.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
  { "name": "Langosta", "calories": 91, "protein": 18.3, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 2 },
  { "name": "Langostino", "calories": 93, "protein": 20.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
  { "name": "Mejillon", "calories": 60, "protein": 10.8, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.9 },
  { "name": "Necoras y similares", "calories": 124, "protein": 19.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 5.1 },
  { "name": "Ostras", "calories": 53, "protein": 10.2, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.4 },
  { "name": "Percebes", "calories": 59, "protein": 13.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.5 },
  { "name": "Pulpo", "calories": 51, "protein": 10.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1 },
  { "name": "Quisquilla, camarón", "calories": 82, "protein": 17.6, "carbs": 1.5, "sugar": 1.5, "fiber": 0, "fat": 0.6 },
  { "name": "Sepia", "calories": 71, "protein": 16.1, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.7 },
  { "name": "Vieira", "calories": 84, "protein": 19, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.9 },
    { "name": "Arenques y otros pescados ricos en grasa, salados o ahumados", "calories": 202, "protein": 21, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 13.1 },
    { "name": "Bacalao salado remojado", "calories": 108, "protein": 26, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.4 },
    { "name": "Bacalao y otros pescados pobres en grasa salados o ahumados", "calories": 131, "protein": 31.6, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.5 },
    { "name": "Salmon ahumado", "calories": 142, "protein": 25.4, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 4.5 },
    { "name": "Sardinas saladas o ahumadas", "calories": 202, "protein": 21, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 13.1 },
    { "name": "Anchoas en aceite", "calories": 195, "protein": 27.4, "carbs": 0.4, "sugar": 0.4, "fiber": 0, "fat": 9.3 },
    { "name": "Atun en aceite", "calories": 317, "protein": 24, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 24.5 },
    { "name": "Bonito en aceite", "calories": 317, "protein": 24, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 24.5 },
    { "name": "Caballa y otros pescados en aceite", "calories": 171, "protein": 15, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 24.5 },
    { "name": "Sardinas en aceite", "calories": 224, "protein": 22.22, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 15 },
    { "name": "Atun en escabeche", "calories": 171, "protein": 15, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 12 },
    { "name": "Bonito en escabeche", "calories": 171, "protein": 15, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 12 },
    { "name": "Caballa y otros pescados en escabeche", "calories": 171, "protein": 15, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 12 },
    { "name": "Sardinas en escabeche", "calories": 131, "protein": 15, "carbs": 0.8, "sugar": 0.8, "fiber": 0, "fat": 7.5 },
    { "name": "Sardinas en salsa de tomate", "calories": 260, "protein": 16.8, "carbs": 0.5, "sugar": 0.5, "fiber": 0, "fat": 21.2 },
      { "name": "Almejas y similares, en conserva al natural", "calories": 47, "protein": 10.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 12 },
      { "name": "Atun en conserva, al natural escurrido", "calories": 108, "protein": 24.5, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 1.1 },
      { "name": "Berberecho o similares, en conserva o al natural", "calories": 47, "protein": 10.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 0.5 },
      { "name": "Calamares o similares en conserva", "calories": 88, "protein": 17, "carbs": 1.5, "sugar": 0.5, "fiber": 0, "fat": 2 },
      { "name": "Mejillon en conserva, al natural", "calories": 82, "protein": 12, "carbs": 2, "sugar": 2, "fiber": 0, "fat": 2.9 },
      { "name": "Mejillon en escabeche", "calories": 169, "protein": 10.7, "carbs": 0, "sugar": 0, "fiber": 0, "fat": 14 },
      { "name": "Aceitunas con hueso", "calories": 196, "protein": 0.8, "carbs": 1, "sugar": 1, "fiber": 4.4, "fat": 20 },
      { "name": "Aceitunas rellenas", "calories": 146, "protein": 2.09, "carbs": 0, "sugar": 0, "fiber": 4, "fat": 100 },
      { "name": "Aceitunas sin hueso", "calories": 196, "protein": 0.8, "carbs": 1, "sugar": 1, "fiber": 4.4, "fat": 20 },
      { "name": "Berenjenas encurtidas", "calories": 54, "protein": 0.9, "carbs": 9.8, "sugar": 4.8, "fiber": 2.5, "fat": 0.7 },
      { "name": "Corteza de trigo", "calories": 495, "protein": 10.3, "carbs": 52.2, "sugar": 1.2, "fiber": 6.3, "fat": 25.8 },
      { "name": "Pepinillos en vinagre", "calories": 27, "protein": 1.7, "carbs": 4.5, "sugar": 1.2, "fiber": 960, "fat": 0 }
]
;
