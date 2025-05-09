def make_requirements(funcs):
    reqs=[]
    for f in funcs:
        meaning = (
            f.get('llm_summary')
            or f.get('underlying_meaning')
            or (f.get('docstring',"").split('.')[0])
        )
        if not meaning:
            meaning=f"include function {f['name']}"
        if not meaning.endswith('.'): meaning+='.'
        reqs.append({
            "requirement":"The system shall "+meaning,
            "file":f['file'],
            "function":f['name'],
            "language":f.get('language','unknown')
        })
    return reqs
