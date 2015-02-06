package Core;

import Readers.BMConfigAndTabFileReader;

import java.util.*;

/**
 * Represents a row in a data file
 *
 * @author jdeck
 */
public class BMRow {


    private BMRowClassifier BMCoord;

    /**
     * Encapsulate knowledge of a row that has been passed in.  Stores all fields and has convenience
     * functions to get Latitude, Longitude, ErrorRadiusInMeters, and Datum
     *
     * @param line
     */
    //public BMRow(int line, Object[] header, Object[] headerAlias, Object[] viewList, String lineStr, BMJoins join) {
    public BMRow(int line, BMConfigAndTabFileReader fileReader, String lineStr, BMJoins join) {
        Object[] header = fileReader.columns;
        Object[] headerAlias = fileReader.columnsAlias;
        Object[] viewList = fileReader.viewList;

        double Latitude = 0;
        double Longitude = 0;
        double ErrorRadiusInMeters = 0;
        String Datum = "";
        ArrayList fields = new ArrayList();

        // LinkBack Logic
        String linkbackField = "";
        String linkbackValue = "";
        if (fileReader.recordLinkBack != null) {
            linkbackField = fileReader.recordLinkBack.getValue1();
        }

        BMLineStringReader lsr = new BMLineStringReader(lineStr);
        String JoinPart1 = "", JoinPart2 = "";
        Iterator lsri = lsr.iterator();
        //ArrayList linkbackPatterns = new ArrayList();
        Map valuesMap = new HashMap();


        for (int i = 0; i < header.length; i++) {
            String title = "";
            String value = "";
            String titleAlias = "";
            Boolean viewlist = true;

            try {
                value = (String) lsri.next();
            } catch (NoSuchElementException e) {
                value = "";
            }
            try {
                title = (String) header[i];
            } catch (ArrayIndexOutOfBoundsException e) {
                title = "column" + i;
                System.err.println("Title Elements out of bounds");
            }
            try {
                titleAlias = (String) headerAlias[i];
            } catch (ArrayIndexOutOfBoundsException e) {
                titleAlias = "column" + i;
                System.err.println("Title Elements out of bounds");
            }
            try {
                viewlist = (Boolean) viewList[i];
            } catch (ArrayIndexOutOfBoundsException e) {
                viewlist = true;
                System.err.println("ViewList Elements out of bounds");
            }
            // Set the linkbackValue t
            // If this is method = patterh do the following
            if (
                    fileReader.recordLinkBack != null &&
                            title != null &&
                            //fileReader.recordLinkBack.getURL() !=null &&
                            fileReader.recordLinkBack.getMethod().equals("pattern")) {
                if (fileReader.recordLinkBack.getLinkurl().contains(title)) {
                    valuesMap.put(title, value);
                }
            } else if (title.equalsIgnoreCase(linkbackField)) {
                linkbackValue = value;
            }

            // Join will take its geographic information from the join itself
            if (join != null) {
                if (title.equalsIgnoreCase(join.getFieldname1())) {
                    JoinPart1 = value;
                }
                if (title.equalsIgnoreCase(join.getFieldname2())) {
                    JoinPart2 = value;
                }
                // If this is not a joint then these values are specified directly
            } else if (title != null && value != null) {
                // Assign application specific field names
                // TODO: Log these errors when they occur
                if (title.equalsIgnoreCase("Latitude")) {
                    try {
                        Latitude = round(Double.parseDouble(value), 4);
                        if (Latitude > 85) Latitude = 85;
                        if (Latitude < -85) Latitude = -85;
                    } catch (Exception e) {
                        Latitude = 0;
                    }
                } else if (title.equalsIgnoreCase("Longitude")) {
                    try {
                        Longitude = round(Double.parseDouble(value), 4);
                    } catch (Exception e) {
                        Longitude = 0;
                    }
                } else if (title.equalsIgnoreCase("ErrorRadiusInMeters")) {
                    try {
                        ErrorRadiusInMeters = Double.parseDouble(value);
                    } catch (Exception e) {
                        ErrorRadiusInMeters = 0;
                    }
                } else if (title.equalsIgnoreCase("Datum")) {
                    try {
                        Datum = value;
                    } catch (Exception e) {
                        Datum = "";
                    }
                }
            }

            fields.add(new BMField(title, titleAlias, viewlist, value));
        }

        // Set the linkback field
        if (fileReader.recordLinkBack != null) {
            if (fileReader.recordLinkBack.getMethod().equals("pattern")) {
                fileReader.recordLinkBack.setMap(valuesMap);
            } else {
                fileReader.recordLinkBack.setValue(linkbackValue);
            }

            String url = fileReader.recordLinkBack.getURL();
            if (url != null) {
                fields.add(new BMField(fileReader.recordLinkBack.getFieldname(), fileReader.recordLinkBack.getFieldname(), true, url));
            }
        }

        if (join != null) {
            BMCoordinate coord = join.usCounty.search(JoinPart1 + ":" + JoinPart2);
            if (coord != null) {
                this.BMCoord = new BMRowClassifier(line, coord, fields);
            }
        } else if (Latitude != 0 && Longitude != 0) {
            this.BMCoord = new BMRowClassifier(line, Latitude, Longitude, ErrorRadiusInMeters, Datum, fields);
        }
    }

    public BMRowClassifier getBMCoord() {
        return BMCoord;
    }

    public static Double round(Double valueToRound, int numberOfDecimalPlaces) {
        Double multipicationFactor = Math.pow(10, numberOfDecimalPlaces);
        return Math.floor(multipicationFactor * valueToRound + 0.5) / multipicationFactor;
        //Double interestedInZeroDPs = valueToRound * multipicationFactor;
        //return Math.round(interestedInZeroDPs) / multipicationFactor;
    }
}
