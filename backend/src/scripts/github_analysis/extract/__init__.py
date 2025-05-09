from .python import extract as py
from .java import extract as java
from .javascript import extract as js
from .dart import extract as dart
from .php import extract as php
from .csharp import extract as csharp

EXT_MAP={
    '.py':py,'.java':java,
    '.js':js,'.jsx':js,'.ts':js,'.tsx':js,
    '.dart':dart,
    '.php':php,'.php3':php,'.php4':php,'.php5':php,'.php7':php,'.phtml':php,
    '.cs':csharp
}
