import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.logging.LogManager;
/**
 * A simple Java Hello World program, in the tradition of
 * Kernighan and Ritchie.
 */
public class HelloWorld {
  private static Logger theLogger =
    Logger.getLogger(HelloWorld.class.getName());

  public static void main( String[] args ) {

    // The root logger's handlers default to INFO. We have to
    // crank them up. We could crank up only some of them
    // if we wanted, but we will turn them all up.
    Handler[] handlers =
      Logger.getLogger( "" ).getHandlers();
    for ( int index = 0; index < handlers.length; index++ ) {
      handlers[index].setLevel( Level.FINE );
    }

    // We also have to set our logger to log finer-grained
    // messages
    theLogger.setLevel(Level.ALL);
    HelloWorld hello =
      new HelloWorld("Hello world!");
      hello.sayHello();
    }

    private String theMessage;

    public HelloWorld(String message) {
      theMessage = message;
    }

    public void sayHello() {
      theLogger.fine("Hello logging!");
      System.err.println(theMessage);

    }
}
