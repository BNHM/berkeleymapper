## About BerkeleyMapper Spatial Intersection Features
The method BerkeleyMapper uses for computing point in polygon search results is optimized for speed (see "Procedure for Creating a Vector Grid with Attributes" below), and may provide inaccurate results.  The results are useful for estiamtion purposes only.  If you want accurate results, you will need to download the result-set in BerkeleyMapper and then perform point in polygon searches directly in QGIS or ArcGIS.  You will need to download the Global Administrative Boundary and Biome Shapefiles (see section below where these can be found).

### Procedure for Creating a Vector Grid with Attributes 
The procedure below is what was used to create the spatial data file BerkeleyMapper uses.  This process is aimed at speed over accuracy.  

1. Download supporting spatial data
   * Global Administrative Boundaries: https://gadm.org/ 
   * Biomes: https://geospatial.tnc.org/datasets/b1636d640ede4d6ca8f5e369f2dc368b/about (This is the TNC modification of Olsen Ecoregions)
  
2. Buffer biomes and gadm layers by 0.0001 to fix geoprocessing errors. 

3. Next we need to create a 1 degree rectangular grid.  We can experiment with 0.5 or 0.1 grids... I tried this with a 0.1 degree grid and had memory/speed issues on my Mac laptop.  
(use Vector -> Research Tools -> Create Grid)

4. Next we need to join layers to add attributes for each grid cell.
base is the grid file we created in step #3 and then we want to join to each buffered layer from step #2
  * (Vector -> Data Management Tools -> Join Attributes by Location)
  * choose intersects
  * join type mapping is one:one

5. Optional step: merge(?) grid cells that have the same attributes so we don't create situations with multiple adjoining polygons with the same exact data.
   
6. Save using ISO8859-1 charset encoding works better with geotools
