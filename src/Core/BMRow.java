package Core;

import java.util.ArrayList;
import java.util.Iterator;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 3:40 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMRow {
    private double Latitude;
    private double Longitude;
    private double ErrorRadiusInMeters;
    private String Datum;
    private ArrayList fields = new ArrayList();
    private BMCoordinate BMCoord;

    /**
     * Encapsulate knowledge of a row that has been passed in.  Stores all fields and has convenience
     * functions to get Latitude, Longitude, ErrorRadiusInMeters, and Datum
     * @param header
     * @param line
     */
    public BMRow(Object[] header, String line) {
        BMLineStringReader lsr = new BMLineStringReader(line);

        Iterator lsri = lsr.iterator();

        int fieldNum = 0;
        while (lsri.hasNext()) {
            String value = (String) lsri.next();
            String title = null;
            try {
                title = (String) header[fieldNum++];
            } catch (ArrayIndexOutOfBoundsException e) {
                System.out.println("mismatch between values & titles?");
            }
            if (title != null && value != null) {
                // Assign application specific field names
                if (title.equalsIgnoreCase("Latitude")) {
                    Latitude = Double.parseDouble(value);
                } else if (title.equalsIgnoreCase("Longitude")) {
                    Longitude = Double.parseDouble(value);
                } else if (title.equalsIgnoreCase("ErrorRadiusInMeters")) {
                    ErrorRadiusInMeters = Double.parseDouble(value);
                } else if (title.equalsIgnoreCase("Datum")) {
                    Datum = value;
                }
                fields.add(new BMField(title, value));
            }
        }
        this.BMCoord = new BMCoordinate(Latitude,Longitude, fields);
    }

    public double getLatitude() {
        return Latitude;
    }

    public double getLongitude() {
        return Longitude;
    }

    public double getErrorRadiusInMeters() {
        return ErrorRadiusInMeters;
    }

    public String getDatum() {
        return Datum;
    }

    public BMCoordinate getBMCoord() {
        return BMCoord;
    }

    public ArrayList getFields() {
        return fields;
    }
}
