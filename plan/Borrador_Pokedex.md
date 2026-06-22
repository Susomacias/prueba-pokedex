# **Pokédex**

## **OBJETIVO:**

Crear un plan en la carpeta plan/ en archivos .md divididos por fases para desarrollar una aplicación web de una Pokédex virtual.

### **Funcionalidades**

\- Pantalla de Inicio con animaciones  
\- Pantalla de Pokedex responsiva, hay un diseño en svg para horizontal y otro para vertical, será necesario inyectar el html dentro del svg  
\- Filtros y fichas de pokemon  
\- Visualizar los pokémon en 3d con un fondo de su hábitat

### **Tecnologías**

\- [Node.js](http://Node.js)  
\- Typscript  
\- Pokeapi en su versión de graphql  
\- Modelos 3D: [https://raw.githubusercontent.com/Pokemon-3D-api/](https://raw.githubusercontent.com/Pokemon-3D-api/)  
\- [Three.js](http://Three.js)  
\- lucide-react para iconos  
\- Test unitarios: vitest  
\- Test E2E: playwright

## **RECURSOS:**

\- En la carpeta .agents existen múltiples skills, hay que usarlas para cada propósito específico, en cada fase de cada plan hay que especificar que skills hay que usar  
\- En doc\\pokeapi tenemos el proyecto completo de la pokeapi con la finalidad de que puedas obtener información de como usar la versión de graphql de forma optimizada  
\- Tipografía de videojuego: public\\PressStart2P-Regular.ttf  
\- Imágenes de Fondo de Hábitats public\\habitats  
\- Recursos para la página de inicio: public\\pagina\_inicio  
\- Favicon: public\\favicon.png para sustituir el que trae [next.js](http://next.js) por defecto cuando se instala  
\- public\\pokedex\_horizontal.svg para el diseño de pantallas grandes responsivo  
\- public\\pokedex\_vertical.svg para el diseño de pantallas pequeñas responsivo

## **CONSIDERACIONES GENERALES:**

\- Añade gitignore necesarios, como por ejemplo a la carpeta de doc/  
\- La aplicación debe ser totalmente responsiva  
\- La aplicación debe tener diseño de videojuego puedes instalar librerías y dependencias que creas necesarias para hacer animaciones y dar aspecto de videojuego.  
\- No queremos apariciones y desapariciones bruscas de elementos, todo debe estar animado o transicionado  
\- En cada fase de cada plan hay que valorar si es necesario o no actualizar [README.md](http://README.md) para desarrollador humano, especialmente instrucciones de uso y cómo desplegar el sistema.   
\- En cada fase de cada plan hay que valorar si es necesario o no actualizar [AGENTS.md](http://AGENTS.md)  
\- Este borrador no está escrito en orden de desarrollo, hay que planificar el orden de desarrollo más óptimo  
\- Primero desarrollamos siempre los puntos donde obtenemos datos y luego desarrollamos los puntos de diseño y no al revés.  
\- Tras terminar una fase donde se ha implementado un diseño, especificar que se necesita revisión humana.  
\- Necesitaremos un diseño sencillo para una página de 404  
\- El idioma de la aplicación será español  
\- Usaremos componente reutilizables siempre que un elemento pueda repetirse con variaciones  
\- Ten en cuenta en los estilos CSS añadir transiciones para que cuando cambien su estado o contenido transiten suavemente.  
\- El motivo de usar la versión de pokeapi de graphql es el poder hacer mejores consultas más optimizadas, así que es importante traer solo los datos necesarios para mostrar de forma optimizada  
\- A la hora de obtener información de la pokeapi, se puede optimizar precargando información que aun no es solicitada ni pedida pero que sea previsible que se solicite para que cargue más rápido pues ya estaría en memoria, pero no demasiada para no sobrecargar el sistema. También se puede optimizar con caché de servidor si es menester.  
\- Nunca usar emojis, solo iconos o dibujos en svg  
\- El diseño es de estilo “dibujo animado 2D” así que elementos como botones y demás deben ser acordes  
\- Existen algunas funcionalidades bidireccionales como el routing o la consola de terminal \+ filtros dropdown, no dupliques los sistemas hay que optimizar el desarrollo para manejar los sistemas con las mismas funciones.

## **TESTING:**

\- Antes de comenzar el desarrollo de una fase se deben diseñar los test para ejecutarlos al final de cada fase donde se generó código o acciones.  
\- Todas las consultas y todas las acciones en pantalla deben tener su test y debe pasar antes de dar la fase o el plan por finalizado (Las fases de transición y configuración no requerirán test)

## **ROUTING:**

\- Hay que generar un sistema de routing, para la página de inicio, la pokedex, la 404, y las fichas de pokemon (Con nombre del pokemon en lugar de id para que sean amigables)  
\- Los filtros se manejarán por parámetros de búsqueda desde la url  
\- Para los filtros y fichas necesitamos que las rutas sean bidireccionales, si se aplica un filtro se pone la url y si se pone la url se aplica el filtro pero si se aplica el filtro nunca debe recargar la página ni nada por el estilo.  
\- Hay que tener en cuenta este punto en cada interacción con la pokedex

## **PÁGINA DE INICIO:**

### **CONSIDERACIONES:** 

\- Si es necesario para cargar los elementos de la página inicial se puede hacer un loading con public\\loading-pikachu.gif y el texto cargando… Para ello habría que definir cuando están cargados los elementos necesarios.

### **DISEÑO:**

\- Los elementos tendrán que encajar siempre en el alto de la pantalla, no habrá scroll lateral ni vertical  
\- Fondo: public\\pokedex\_vertical.svg disponemos de este tile para hacer un mosaico, necesitamos que el fondo esté animado como si se moviera hacia arriba a 45grados, supongo que hay que ir destruyendo los tiles que estén fuera de pantalla y creando los que estén dentro, que la animación sea lenta.  
\- Parte superior public\\pagina\_inicio\\logo.svg Logo centrado  
\- Parte del Medio:  
\* Centrado en la página public\\pagina\_inicio\\pokedex\_cerrada.svg  
\* A la Izquierda de la pokedex pero superponiendose un poco sobre esta public\\pagina\_inicio\\pokedex\_cerrada.svg (Este elemento puede quedar parcialmente cortado o ser algo más pequeño si es necesario en las vistas móviles para no tapar del todo la pokedex)  
\* A la Derecha de la pokedex pero superponiendose un poco sobre esta Una animación de slider de los pokemon (Este elemento puede quedar parcialmente cortado o ser algo más pequeño si es necesario en las vistas móviles para no tapar del todo la pokedex)  
\- Parte Inferior:  
\* Un botón discreto para activar el sonido, debe tener un icono, al pulsar sonará public\\pagina\_inicio\\musica.mp3 en bucle  
\* Un botón de Press Start animado para llamar la atención y que sea pulsado  
\- Si se hace click o se pulsa cualquier tecla de letras o enter se navega a la pokedex

### **ANIMACIÓN DE POKEMONS**

\- Ciclo:  
\* El pokémon aparece desde la derecha  
\* El pokémon espera tres segundos  
\* El pokémon desaparece hacia la derecha  
\* Desde la derecha aparece el siguiente pokémon  
\* Al llegar al último pokémon se vuelve a empezar desde el primero  
\- Orden de aparición:  
1.- Charmander  
2.- Ponita  
3.- Caterpi  
4.- Squiertel  
5.- Pikachu  
6.- Rinomer  
7.- bulbasur  
8.- onix  
9.- kadabra  
10.- magicarp  
\- Habrá un elemento invisible debajo de la pantalla

## **TRANSICIÓN DE INICIO A POKÉDEX:**

\- Creamos una pokedex (Horizontal o vertical dependiendo del tamaño de la pantalla) en la parte inferior fuera de la pantalla  
\- Si la música se estuviera ejecutando bajamos el volúmen lentamente  
\- Logo: Transiciona a la parte superior derecha pero más pequeño, al pulsarlo vuelve a la página de inicio  
\- Ash: va hacia la izquierda de la pantalla para desparecer y se destruye  
\- Animación de pokemons, va hacia la derecha de la pantalla y se destruye  
\- Botones y pokedex cerrada va hacia abajo de la pantalla y se destruye  
\- Transicionamos la pokedex horizontal o vertical al medio de la pantalla para comenzar su manejo.

## **TRANSICIÓN DE POKÉDEX A INICIO:**

Será igual que la transición de inicio a pokédex pero al revés. Hay que cargar los elementos y asegurarse de que estén cargados antes de empezar la animación.

## **PÁGINA DE POKÉDEX:**

### **CONSIDERACIONES:**

\- public\\pokedex\_vertical.svg y public\\pokedex\_horizontal.svg no debes utilizarlos como recurso de imagen si no como código, hay que pasarlo hay un archivo typescript y añadir los puntos donde se inyectará el código html correspondiente, ambos archivos traen capas invisibles que delimitan los espacios disponibles para los elementos que hay que añadir, están nombrados con el nombre de la capa, la lógica de cómo crear el html para inyectar debe estar en otro archivo, pues el código svg es muy grande y acabaríamos con un archivos excesivamente grande complicado de manejar si metieramos toda la lógica en el mismo sitio.  
\- Importante: No añadas la lógica de cómo construir el html que se inyectará en el svg de la pokédex en el mismo documento donde esté el código svg pues quedaría un archivo demasiado grande e inmanejable, tampoco pongas el código svg horizontal o vertical en el mismo archivo, ponlos separados.  
\- Ten en cuenta que la disposición de los elementos de la pokedex vertical son distintas a la horizontal, deben adaptarse.  
\- En los SVG de las pokedex hay clases nombradas explícitamente que contienen un solo objeto específico para delimitar la inserción de html en el perímetro de ese objeto, nunca debe sobresalir de ahí.

### **DISEÑO:**

\- Usar public\\loading-pikachu.gif muy pequeño como loading: Cuando se inicie la carga de datos el personaje se moverá rápidamente desde el logo hasta la derecha de la pantalla hasta desaparecer, si los datos no han cargado se repite, pero la animación siempre debe concluir con el elemento desapareciendo a la derecha de la pantalla. Si se hacen varias cargas de datos muy seguidas y la animación aún no terminó, no hacerla pues se pisarán, hay que ver el estado de si hay datos cargando o no para mostrar la animación.  
\- La pokedex nunca debe sobresalir de la pantalla, no debe haber scroll vertical ni horizontal, pero cuidado en la vista de móvil, cuando se despliega el teclado que no tape el input donde está escribiendo.  
\- Hay que tener especial cuidado con los estilos de los manejadores de overflow de las cajas, deben ser finos y acordes al tamaño y estilo de la caja, muy discretos.

#### **CAPAS DEL SVG PARA INYECTAR HTML**

##### **CARCASA**

Esta capa no se toca, solo es el fondo, es el diseño de la propia pokedex simulando una pokedex virtual, no tiene ninguna funcionalidad.

##### **BOTON 3D**

Solo cuando el objeto 3D esté disponible, se mostrará un icono de un cubo o cualquier otro que simbolice “Ver en 3D” con las letras “3D”.  
Se comportará como un botón pero no tendrá fondo  
El icono y las letras serán Azul oscuro y cuando se rendericen harán una animación de 3 segundos para llamar la atención.

##### **TIPO1 \_ TIPO2 \_ GENERACIÓN**

En este espacio colocaremos chips de información cuando exista un pokemon seleccionado, si no hay pokemon seleccionado, los chips serán visibles pero vacíos (Se puede poner 3 espacios por ejemplo para que tengan cuerpo)  
Los chips vacíos tendrán los siguientes colores:  
\- Tipo 1: Granate  
\- Tipo 2: Amarillo anaranjado  
\- Tipo 3: Verde

###### ***TIPO1 Y TIPO2***

\- Hay que harcodear un código de color para cada tipo de pokemon y mostrarlo en la chip (Tendrán un color muy oscuro en el borde y las letras y un color más claro de fondo pero en el mismo tono), necesitamos un color genérico por si aparece un tipo que no esté contemplado. Hay que ver los tipos en la pokeapi antes de definirlos  
\- Estos dos elementos irán juntos  
\- Pokedex Horizontal: A la derecha del límite del espacio  
\- Pokedex Vertical: En la parte superior del límite del espacio

###### ***GENERACIÓN***

\- Hay que harcodear un código de color para cada generación de pokemon y mostrarlo en la chip (Tendrán un color muy oscuro en el borde y las letras y un color más claro de fondo pero en el mismo tono), necesitamos un color genérico por si aparece una generación que no esté contemplada. Hay que ver las generaciones en la pokeapi antes de definirlos  
\- Pokedex Horizontal: A la izquierda del límite del espacio  
\- Pokedex Vertical: En la parte inferior del límite del espacio

##### **CARRUSEL IMÁGENES DESCRIPCIÓN**

\- Lo mejor es un fondo gris muy muy claro casi blanco.

###### ***LISTAS***

\- En primera instancia y sin filtros aplicados, en este espacio se mostrarán los 30 primeros elementos de la lista de pokemons con los siguientes datos:  
\* Miniatura de imagen a la derecha de la card, ocupando todo el alto  
\* Nombre del pokemon en grande a la izquierda a lado de la imagen  
\* En pequeño debajo del nombre las chips del tipo 1 y el tipo 2 del pokemon  
\* A la derecha las chips de Habitat y Generación  
\- Si el usuario desliza hacia abajo para ver más lista se cargarán los 30 siguientes a continuación (Sin que el usuario lo note), si sigue bajando otros 30 pero hay que destruir los primeros 30 cuando se visualice el 60, el objetivo es que no existan demasiados elementos en pantalla que ocupen demasiada memoria en el navegador. El proceso si se navega hacia arriba es a la inversa, si el usuario navega demasiado rápido hay que poner un loading muy discreto en el punto donde se vayan a cargar datos

###### ***CARRUSEL DE IMAGENES E INFO DE POKEMON***

\- Cuando se seleccione un pokemon la lista desaparecerá y se mostrará un carrusel de imágenes e información.  
\- El sistema tendrá una animación que pase las diapositivas cada 5 segundos salvo que el usuario toque los botones de carrusel  
\- En la parte superior izquierda y en grande debe verse siempre visible el nombre del pokemon  
\- La primera imagen será la imagen principal del pokemon de la pokeapi  
\- La segunda será esa misma imagen pero en pequeño en la parte izquierda y a la derecha la descripción del pokemon, la descripción requerirá de su propia ventana con overflow vertical  
\- El resto de las imágenes serán las imágenes que estén disponibles en la pokeapi, máximo 7 imágenes

##### **PUNTOS CARRUSEL**

\- En este espacio se pondrán tantos puntos como elementos existan en el carrusel  
\- Deben simular pilotos led, hay que poner como apagados todos los elementos e iluminar el elementos que esté encendido  
\- El diseño debe ser pequeño y los efectos de brillo no pueden ser muy potentes, debe quedar bien perfilado sobre el fondo gris claro donde va a estar (Ese fondo ya está puesto en la carcasa, no hay que ponerlo)

##### **BOTONES CARRUSEL**

\- Serán dos botones con efecto de botón analógico de maquina recreativa o consola, uno será un triangulo hacia la izquierda y el otro a la derecha  
\- Al pulsar los botones la animación del carrusel se detendrá y se irá hacia delante o hacia atrás pulsando los botones.

##### **SONIDO POKEMON**

\- Hay que poner un botón similar a los botones del carrusel con un icono de sonido, al pulsar sonará el sonido del pokemon obtenido de la pokeapi

##### **EVOLUCIONES**

\- En este punto se mostrará una lista del árbol de evoluciones del pokemon  
\- Hay que destacar el pokemon donde está para saber que evoluciones hay antes y después, deben estar en orden.  
\- El diseño debe simular una pantalla verde lcd antigua  
\- Hay que poner una imágen en escala de grises y con un filtro para que se fusione con la pantalla para que parezca lcd, luego el nombre del pokemon al lado de la imagen y luego a la derecha al nivel que evoluciona o que necesita para evolucionar en pequeño  
\- Al pulsar en una evolución se cargará el pokemon en la pokedex

##### **STATS**

\- En este punto se mostrarán los stats del pokemon en primera instancia  
\- También en diseño de pantalla verde LCD  
\- También se mostrarán la lista de habilidades cuando sea requerido por el botón con el nombre de la habilidad y el nivel al que se obtiene

##### **VER HABILIDADES \_ VER STATS**

\- Debe tener diseño alargado negro como un botón de start de las consolas clásicas  
\- Este botón transiciona la pantalla de stats a habilidades  
\- Hay que cambiar el nombre del botón según se está viendo stats o habilidades en la pantalla

##### **CONSOLA FILTROS**

\- Debe tener el diseño de una consola de terminal, con el fondo negro y letras blancas  
\- También debe funcionar como una consola, se deben poder elegir filtros escribiendo comando: filtro, también tendrá un help que mostrará los filtros y comandos disponibles y habrá un options filtro para mostrar las opciones de un filtro en concreto  
\- Hay que incluir el buscador como un filtro más.  
\- Incluir un comando de resumen de filtros y un comando para quitar filtros  
\- Incluir un comando de limpiar pantalla y otro para quitar todos los filtros  
\- Al pulsar enter se aplicarán los filtros  
\- La lista de filtros hay que mostrarla con un icono de una pokeball para cada filtro e indicar los elementos disponibles en ese filtro (los elementos disponibles los obtendremos de forma asíncrona para no bloquear la consola y se mostrará cuando esté disponible)  
\- El buscador actúa como un filtro más  
\- Si se aplica un filtro, este debe reflejarse en los filtros de dropdowns o el buscador  
\- Si al obtener la lista solo existe un pokemon, en lugar de obtener la lista se muestra directamente el pokemon

##### **DROPDOWNS FILTROS**

###### ***Lista de filtros***

\- Tipo1  
\- Tipo 2  
\- Generación  
\- Color  
\- Hábitat  
\- Altura  
\- Peso  
\- Habilidad

###### ***Diseño***

\- Disponer en dos filas de 4 botones  
\- Deben simular un botón plano cuadrado de color cyan algo oscuro con una pequeña elevación  
\- Al pulsar se desplegará del dropdown hacia arriba con todas las opciones disponibles para seleccionar y un buscador que filtre las opciones  
\- Al seleccionar una opción se mostrará en consola la lista de filtros aplicados actualizada y aplicar los filtros activos para mostrar la lista  
\- Si al obtener la lista solo existe un pokemon, en lugar de obtener la lista se muestra directamente el pokemon

##### **BUSCAR RESET FILTRAR**

###### ***BUSCAR***

\- Tendrá apariencia de una pantalla pequeña LCD, se visualizará un icono de lupa pero el circulo de la lupa será una pokeball, hay que diseñarla en svg  
\- En primera instancia buscará entre los nombres de los pokemon y se mostrarán en un dropdown que salga de la parte superior para seleccionar uno, si no hay pokemons y hay más de tres letras, se buscará en las descripciones, tipos, hábitats, generación...

###### ***RESET***

\- Debe tener diseño alargado negro como un botón de start de las consolas clásicas  
\- El botón quita todos los filtros y limpia la consola de terminal, y muestra la lista inicial de pokemons

###### ***FILTRAR***

\- El diseño será con efecto de botón analógico de máquina recreativa o consola de videojuegos con un triangulo hacia la derecha  
\- Si hay un pokémon seleccionado, este botón vuelve a mostrar la lista obtenida en los filtros.

### **FONDO:**

El fondo con la animación de la página de inicio se mantiene, pero esta vez vamos a poner un color al body con un degradado de 234476 a 0c1c3e (Los tiles no lo taparán pues ya incluyen transparencia)  
Cuando se muestre la ficha de un pokemon se va a mostrar el fondo de su habitat, la imágen del habitat no debe aparecer de golpe queremos que tenga una animación rápida en la que la imágen salga en pequeño desde la derecha y se haga más grande hasta ocupar el ancho de la pantalla  
La imágen del habitat debe tener un pequeño degradado de transición en la parte inferior para fundir con el fondo de degradado

### **VISTA 3D:**

\- Tras obtener los datos de la ficha de un pokemon y renderizarlos en pantalla, se comenzará el proceso asíncrono de obtener el elemento 3D  
\- Los obtendremos de este repositorio: [https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular/1.glb](https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular/1.glb) siendo el número final el id del pokemon a elegir  
\- El botón de 3D solo se renderiza cuando el objeto esté disponible y cargado en la página (pero invisible con opacidad 0), es posible que algún pokemon no exista o de error, en esos caso el botón simplemente no se muestra  
\- El elemento 3D debe tener un tamaño apropiado para visualizarse, es posible que los objetos 3D tengan diferentes tamaños sin criterio ni escala (Demasiado pequeños o grandes), hay que adecuarlos para que se vean bien individualmente.  
\- El pokemon se verá desde arriba en plano inclinado para que no quede como un videojuego  
\- Tendrá una animación de rotación lenta para ver el pokemon  
\- El usuario podrá rotarlo horizontalmente deslizando el mouse o dedo por la pantalla donde está el pokemon  
\- Al pulsar el botón de ver en tres de se procede de la siguiente manera:  
\* La pokédex transiciona hacia abajo dejando visible el hábitat del pokémon que está de fondo (Aquí SÍ será necesario que la pantalla haga scroll vertical)  
\* Se hace una transición del pokemon 3d a opacidad 1  
\* Habrá una animación  
\* Si se hace click en el botón de ver 3D con el objeto mostrandose se hace la transición a la inversa  
\* Si se aplica un filtro o se llama a un nuevo pokemon se destruye el elemento se hace la transición a la inversa y se destruye el elemento 3D

---------------------
Correcciones:
Hay que corregir algunas cosas en la página de inicio:
- Ash y la animación de los pokemon están muy lejos de la pokedex cerrada, deberían estar más cerca
- El diseño debería ser responsivo pero en la vista de móvil ash y la animación de los pokemon queda fuera de la pantalla, no pasa nada si esos dos elementos se hacen más pequeños y se superponen un poco a la pokedex cerrada.
- El logo, la pokedex cerrada y el botón de press start están muy pegados verticalmente, habría que dejar algo de espacio entrellos aunque haya que hacerlos más pequeños
- El botón de press start está muy pegado a la parte inferior de la pantalla, debería tener algo de separación.
- Al añadir espacios verticales recuerda que la pantalla de inicio no debe hacer scroll vertical ni los elementos deben sobresalir.
-------------
Los cambios no han ido bien:
En la vista de pc Ash y la anmiación de los pokemon deberían estar cerca de la pokedex cerrada pero están muy lejos
En la vista de smartphone la pokedex se ve muy pequeña y delante de Ahs y la animación de pokemon, la pokedex debería estar grande y detrás y ser Ahs y la animación de pokemon los que estén delante y más pequeños.
-----------
Hay errores importantes:
- El diseño de la transición entre página de inicio y la página de pokedex no está realizado según el borrador del plan, hay que revisarlo, estos son algunos problemas pero podría haber más.
* El logo de la página de inicio debería transitar del centro a la parte izquierda de la pantalla y funcionar como un botón para volvera a la página de inicio.
* Hay un loading no solicitado en el borrador, todos los elementos deberían estar ya cargados al inicar la página de inicio listos para transicionar a la página de pokedex
* La pokedex aparece de repente en lugar de transicionar desde abajo de la pantalla hacia el medio
- La pokedex abierta en la vista de pc es demasiado grande está muy pegada a la parte superior e inferio de la pantalla, debería haber un poco de espacio pero sin overflow
- La parte de la pokedex donde iría la lista y el carrusel marca este error:Error cargando la lista: not a valid graphql query, lo que indica que no solo está mal la query si no que también está mal los test.
Estamos en el punto del plan de desarrollo 06.2, analiza si estos problemas están previstos y se van a arreglar posteriormente y si no estaban previstos hay que dejarlos arreglados.