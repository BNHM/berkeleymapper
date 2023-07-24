1. First we need to buffer biomes and gadm layers by 0.0001 to fix geoprocessing errors. 
Save output as biomes_buffered, admn_0_buffered, admn_1_buffered, admn_2_buffered

2. Next we need to create a 1 degree rectangular grid and a 0.1 degree rectangular grid
(use Vector -> Research Tools -> Create Grid)

3. Next we need to join layers (Vector -> Data Management Tools -> Join Attributes by Location)
base is grid1 and join to admn_0_buffered, etc....
choose intersects
join type mapping is one:one

4. Save using ISO8859-1 charset encoding works better with geotools
