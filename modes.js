var modes = [];
function getModeFromPath(path) {
    var mode = modesByName.text;
    for (var i = 0; i < modes.length; i++) {
        if (modes[i].supportsFile(path)) {
            mode = modes[i];
            break;
        }
    }
    return mode;
};

BLAHMOO = /^.*\.(coffee|^Cakefile)$/g

var Mode = function(name, desc, extensions) {
    this.name = name;
    this.desc = desc;
    this.mode = "ace/mode/" + name;
    var regex = new RegExp("^.*\\.(" + extensions + ")$");
    this.extRe = regex;
    this.test = function(str){
        //crap this is the most messed up behavior ever 
        //http://stackoverflow.com/questions/7331753/strange-behavior-of-javascript-regex-test-function
        var value = regex.test(str);
        return value
    }
};

Mode.prototype.supportsFile = function(filename) {
    return filename.match(this.extRe);
};

var modesByName = {
    coffee:     ["CoffeeScript" , "coffee|^Cakefile"],
    coldfusion: ["ColdFusion"   , "cfm"],
    csharp:     ["C#"           , "cs"],
    css:        ["CSS"          , "css"],
    diff:       ["Diff"         , "diff|patch"],
    golang:     ["Go"           , "go"],
    groovy:     ["Groovy"       , "groovy"],
    haxe:       ["haXe"         , "hx"],
    html:       ["HTML"         , "htm|html|xhtml"],
    c_cpp:      ["C/C++"        , "c|cc|cpp|cxx|h|hh|hpp"],
    clojure:    ["Clojure"      , "clj"],
    java:       ["Java"         , "java"],
    javascript: ["JavaScript"   , "js"],
    json:       ["JSON"         , "json"],
    latex:      ["LaTeX"        , "latex|tex|ltx|bib"],
    less:       ["LESS"         , "less"],
    liquid:     ["Liquid"       , "liquid"],
    lua:        ["Lua"          , "lua"],
    markdown:   ["Markdown"     , "md|markdown"],
    ocaml:      ["OCaml"        , "ml|mli"],
    perl:       ["Perl"         , "pl|pm"],
    pgsql:      ["pgSQL"        , "pgsql"],
    php:        ["PHP"          , "php|phtml"],
    powershell: ["Powershell"   , "ps1"],
    python:     ["Python"       , "py"],
    ruby:       ["Ruby"         , "ru|gemspec|rake|rb"],
    scad:       ["OpenSCAD"     , "scad"],
    scala:      ["Scala"        , "scala"],
    scss:       ["SCSS"         , "scss|sass"],
    sh:         ["SH"           , "sh|bash|bat"],
    sql:        ["SQL"          , "sql"],
    svg:        ["SVG"          , "svg"],
    text:       ["Text"         , "txt"],
    textile:    ["Textile"      , "textile"],
    xml:        ["XML"          , "xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl"],
    xquery:     ["XQuery"       , "xq"],
    yaml:       ["YAML"         , "yaml"]
};

for (var name in modesByName) {
    var mode = modesByName[name];
    mode = new Mode(name, mode[0], mode[1])
    modesByName[name] = mode;
    modes.push(mode);
}
