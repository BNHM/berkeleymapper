#This describes how to connect to a google spreadsheet

# Introduction #

Some folks generate content in google docs.  It is easy to connect google spreadsheets to BerkeleyMapper by choosing the tab delimited text option in Google Docs.

# Details #

An example "tabfile" that is tab delimited can be called using a link like the following:

https://docs.google.com/spreadsheet/ccc?key=0At2sqNEgxTf3dEt5SXBTemZZM1gzQy1vLVFNRnludHc&output=txt

Note the part on the end "&output=txt".  Just append that to your google document.

The configuration file can be constructed like any ordinary configuration file.